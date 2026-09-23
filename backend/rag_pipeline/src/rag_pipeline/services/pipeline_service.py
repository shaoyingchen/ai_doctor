from __future__ import annotations

import os
from pathlib import Path

from rag_pipeline.chunking.registry import build_chunker
from rag_pipeline.graphs.enhance_index_graph import EnhanceIndexGraph
from rag_pipeline.graphs.parse_graph import ParseGraph
from rag_pipeline.indexing.upsert_manager import UpsertManager
from rag_pipeline.storage.doc_store import InMemoryDocStore
from rag_pipeline.storage.graph_store import InMemoryGraphStore
from rag_pipeline.storage.vector_store import InMemoryVectorStore

# InMemory store 写穿透落盘目录（默认 backend/data/rag_store/，可用环境变量覆盖）。
# parents: [0]=services [1]=rag_pipeline(包) [2]=src [3]=rag_pipeline(仓库) [4]=backend
_DEFAULT_STORE_DIR = Path(__file__).resolve().parents[4] / "data" / "rag_store"
RAG_STORE_DIR = Path(os.getenv("RAG_STORE_DIR") or str(_DEFAULT_STORE_DIR))


class PipelineService:
    """RAG 流水线编排服务（两阶段：Parse -> Enhance+Index+Store）。

    阶段拆分的目的：Parse 完成后若质量门禁/阈值要求人工审核，调用方可在
    两阶段之间中断（写 checkpoint），人工 approve 后再从 Enhance 阶段恢复，
    语义对齐 LangGraph 的 interrupt/checkpointer，便于日后替换为 LangGraph
    原生 checkpoint 机制。
    """

    def __init__(self, store_dir: str | Path | None = None) -> None:
        persist_dir = Path(store_dir) if store_dir else RAG_STORE_DIR
        self.doc_store = InMemoryDocStore(persist_path=persist_dir / "docs.json")
        self.vector_store = InMemoryVectorStore(persist_path=persist_dir / "vectors.json")
        self.graph_store = InMemoryGraphStore(persist_path=persist_dir / "graph.json")
        self.upsert_manager = UpsertManager(
            doc_store=self.doc_store,
            vector_store=self.vector_store,
            graph_store=self.graph_store,
        )
        self.parse_graph = ParseGraph(self.upsert_manager)
        self.enhance_graph = EnhanceIndexGraph(
            doc_store=self.doc_store,
            vector_store=self.vector_store,
            graph_store=self.graph_store,
        )

    # ------------------------------------------------------------------
    # 阶段一：Parse（ingest -> parse -> normalize -> quality_gate -> chunks）
    # ------------------------------------------------------------------
    def run_parse_stage(self, rag_payload: dict) -> dict:
        """执行 Parse 阶段并返回 parse_result。

        注意：ParseGraph 在 requires_review=True 时会跳过 build_chunks 节点
        （条件路由直接到 write_doc_store），此时返回的 chunks 为空列表，
        normalized_blocks 仍然可用（供恢复时兜底构建 chunks）。
        """
        return self.parse_graph.run(rag_payload)

    # ------------------------------------------------------------------
    # 阶段二：Enhance + Index + Store（classify -> ... -> embed -> write -> evaluate）
    # ------------------------------------------------------------------
    def run_enhance_and_store_stage(self, rag_payload: dict, parse_result: dict) -> dict:
        """执行 Enhance/Index/Store 阶段并返回 enhance_result。

        审核恢复场景下 parse 阶段可能跳过了 build_chunks（doc_store 中无
        chunks），此处先用 parse_result.normalized_blocks 兜底构建 chunks
        并写回 doc_store，保证 enhance 图有输入；chunks 已存在时直接使用。
        """
        doc_id = rag_payload["doc_id"]
        if not self.doc_store.load_chunks(doc_id):
            blocks = parse_result.get("normalized_blocks") or []
            if blocks:
                strategy = str(parse_result.get("doc_strategy") or "general")
                try:
                    chunker = build_chunker(strategy)
                except KeyError:
                    chunker = build_chunker("general")
                chunks = chunker.build(
                    doc_id=doc_id,
                    filename=rag_payload.get("filename") or doc_id,
                    blocks=blocks,
                )
                self.doc_store.upsert_chunks(doc_id, chunks)
        return self.enhance_graph.run(doc_id)

    # ------------------------------------------------------------------
    # 兼容包装：完整端到端（同步端点 /api/rag/end-to-end 继续使用）
    # ------------------------------------------------------------------
    def run_parse(self, payload: dict) -> dict:
        return self.run_parse_stage(payload)

    def run_enhance(self, doc_id: str) -> dict:
        return self.enhance_graph.run(doc_id)

    def run_end_to_end(self, payload: dict) -> dict:
        parse_result = self.run_parse_stage(payload)
        enhance_result = self.run_enhance_and_store_stage(payload, parse_result)
        return {"parse": parse_result, "enhance": enhance_result}
