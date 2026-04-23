from __future__ import annotations

from rag_pipeline.graphs.enhance_index_graph import EnhanceIndexGraph
from rag_pipeline.graphs.parse_graph import ParseGraph
from rag_pipeline.indexing.upsert_manager import UpsertManager
from rag_pipeline.storage.doc_store import InMemoryDocStore
from rag_pipeline.storage.graph_store import InMemoryGraphStore
from rag_pipeline.storage.vector_store import InMemoryVectorStore


class PipelineService:
    def __init__(self) -> None:
        self.doc_store = InMemoryDocStore()
        self.vector_store = InMemoryVectorStore()
        self.graph_store = InMemoryGraphStore()
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

    def run_parse(self, payload: dict) -> dict:
        return self.parse_graph.run(payload)

    def run_enhance(self, doc_id: str) -> dict:
        return self.enhance_graph.run(doc_id)

    def run_end_to_end(self, payload: dict) -> dict:
        parse_result = self.run_parse(payload)
        enhance_result = self.run_enhance(payload["doc_id"])
        return {"parse": parse_result, "enhance": enhance_result}
