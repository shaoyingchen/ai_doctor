from __future__ import annotations

from typing import Any, TypedDict

from rag_pipeline.chunking.registry import build_chunker
from rag_pipeline.graphs.nodes.parse_docx import parse_docx_node
from rag_pipeline.graphs.nodes.parse_slides import parse_slides_node
from rag_pipeline.graphs.nodes.parse_spreadsheet import parse_spreadsheet_node
from rag_pipeline.normalization.block_normalizer import normalize_blocks
from rag_pipeline.normalization.quality_gate import evaluate_parse_quality
from rag_pipeline.normalization.section_builder import build_section_paths
from rag_pipeline.parsers.file_inspector import inspect_file
from rag_pipeline.parsers.registry import build_parser
from rag_pipeline.parsers.router import route_by_file_type, select_strategy
from rag_pipeline.utils.file_io import read_bytes

try:
    from langgraph.graph import END, START, StateGraph
except ImportError:
    START = "__start__"
    END = "__end__"

    class _CompiledFallbackGraph:
        def __init__(
            self,
            nodes: dict[str, Any],
            edges: dict[str, str],
            conditional_edges: dict[str, tuple[Any, dict[str, str]]],
        ) -> None:
            self._nodes = nodes
            self._edges = edges
            self._conditional_edges = conditional_edges

        def invoke(self, state: dict[str, Any]) -> dict[str, Any]:
            current = self._edges[START]
            while current != END:
                update = self._nodes[current](state) or {}
                state.update(update)
                if current in self._conditional_edges:
                    router, route_map = self._conditional_edges[current]
                    route_key = router(state)
                    current = route_map[route_key]
                else:
                    current = self._edges[current]
            return state

    class StateGraph:  # pragma: no cover - fallback only
        def __init__(self, _state_type: Any) -> None:
            self._nodes: dict[str, Any] = {}
            self._edges: dict[str, str] = {}
            self._conditional_edges: dict[str, tuple[Any, dict[str, str]]] = {}

        def add_node(self, name: str, func: Any) -> None:
            self._nodes[name] = func

        def add_edge(self, source: str, target: str) -> None:
            self._edges[source] = target

        def add_conditional_edges(self, source: str, router: Any, route_map: dict[str, str]) -> None:
            self._conditional_edges[source] = (router, route_map)

        def compile(self) -> _CompiledFallbackGraph:
            return _CompiledFallbackGraph(self._nodes, self._edges, self._conditional_edges)


class ParseState(TypedDict, total=False):
    doc_id: str
    source_uri: str
    filename: str
    content_type: str
    parser_preferences: dict[str, Any]
    file_bytes: bytes
    file_meta: dict[str, Any]
    doc_strategy: str
    parser_engine: str
    parsed_pages: list[dict[str, Any]]
    normalized_blocks: list[dict[str, Any]]
    chunks: list[dict[str, Any]]
    parse_quality_score: float
    quality_metrics: dict[str, Any]
    requires_review: bool
    errors: list[str]


class ParseGraph:
    """Parse pipeline graph from raw document bytes to normalized chunks and doc-store writes."""

    def __init__(self, upsert_manager: Any) -> None:
        self._upsert_manager = upsert_manager
        self._compiled = self._build_graph().compile()

    def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        initial_state: ParseState = {
            "doc_id": payload["doc_id"],
            "source_uri": payload["source_uri"],
            "filename": payload["filename"],
            "content_type": payload.get("content_type", "application/octet-stream"),
            "parser_preferences": payload.get("parser_preferences", {}),
            "errors": [],
            "chunks": [],
        }
        state = self._compiled.invoke(initial_state)
        return {
            "doc_id": state["doc_id"],
            "normalized_blocks": state.get("normalized_blocks", []),
            "chunks": state.get("chunks", []),
            "parse_quality_score": state.get("parse_quality_score", 0.0),
            "quality_metrics": state.get("quality_metrics", {}),
            "requires_review": state.get("requires_review", True),
            "doc_strategy": state.get("doc_strategy", "general"),
            "parser_engine": state.get("parser_engine", "plaintext"),
            "errors": state.get("errors", []),
        }

    def _build_graph(self) -> StateGraph:
        graph = StateGraph(ParseState)
        graph.add_node("ingest_document", self.ingest_document)
        graph.add_node("inspect", self.inspect)
        graph.add_node("select_strategy", self.select_strategy)
        graph.add_node("parse_pdf", self.parse_pdf)
        graph.add_node("parse_docx", parse_docx_node)
        graph.add_node("parse_slides", parse_slides_node)
        graph.add_node("parse_spreadsheet", parse_spreadsheet_node)
        graph.add_node("normalize_blocks", self.normalize_blocks)
        graph.add_node("parse_quality_gate", self.parse_quality_gate)
        graph.add_node("build_chunks", self.build_chunks)
        graph.add_node("write_doc_store", self.write_doc_store)

        graph.add_edge(START, "ingest_document")
        graph.add_edge("ingest_document", "inspect")
        graph.add_edge("inspect", "select_strategy")
        graph.add_conditional_edges(
            "select_strategy",
            self._route_to_parse_node,
            {
                "parse_pdf": "parse_pdf",
                "parse_docx": "parse_docx",
                "parse_slides": "parse_slides",
                "parse_spreadsheet": "parse_spreadsheet",
            },
        )
        graph.add_edge("parse_pdf", "normalize_blocks")
        graph.add_edge("parse_docx", "normalize_blocks")
        graph.add_edge("parse_slides", "normalize_blocks")
        graph.add_edge("parse_spreadsheet", "normalize_blocks")
        graph.add_edge("normalize_blocks", "parse_quality_gate")
        graph.add_conditional_edges(
            "parse_quality_gate",
            self._route_after_quality_gate,
            {"build": "build_chunks", "write": "write_doc_store"},
        )
        graph.add_edge("build_chunks", "write_doc_store")
        graph.add_edge("write_doc_store", END)
        return graph

    def _route_after_quality_gate(self, state: ParseState) -> str:
        return "build" if not state.get("requires_review", True) else "write"

    def _route_to_parse_node(self, state: ParseState) -> str:
        return route_by_file_type(state.get("file_meta", {}))

    def ingest_document(self, state: ParseState) -> ParseState:
        return {"file_bytes": read_bytes(state["source_uri"])}

    def inspect(self, state: ParseState) -> ParseState:
        file_meta = inspect_file(state["filename"], state["file_bytes"])
        return {"file_meta": file_meta}

    def select_strategy(self, state: ParseState) -> ParseState:
        doc_strategy, parser_engine = select_strategy(state["file_meta"], state.get("parser_preferences", {}))
        return {"doc_strategy": doc_strategy, "parser_engine": parser_engine}

    def parse_pdf(self, state: ParseState) -> ParseState:
        parser = build_parser(state["parser_engine"])
        parsed = parser.parse(file_bytes=state["file_bytes"], filename=state["filename"], metadata=state["file_meta"])
        return {"parsed_pages": parsed.raw_pages}

    def normalize_blocks(self, state: ParseState) -> ParseState:
        normalized = normalize_blocks(state.get("parsed_pages", []), parser_engine=state["parser_engine"])
        normalized = build_section_paths(normalized, doc_strategy=state.get("doc_strategy", "general"))
        return {"normalized_blocks": normalized}

    def parse_quality_gate(self, state: ParseState) -> ParseState:
        blocks = state.get("normalized_blocks", [])
        quality = evaluate_parse_quality(blocks=blocks, parsed_pages=state.get("parsed_pages", []))
        updates: ParseState = {
            "parse_quality_score": quality["parse_quality_score"],
            "quality_metrics": quality["quality_metrics"],
            "requires_review": quality["requires_review"],
        }

        if not blocks:
            return {
                **updates,
                "errors": [*state.get("errors", []), "No normalized blocks generated."],
            }

        if state.get("parser_engine") == "vision_layout" and quality["requires_review"]:
            parser = build_parser("plaintext")
            parsed = parser.parse(
                file_bytes=state["file_bytes"],
                filename=state["filename"],
                metadata=state["file_meta"],
            )
            fallback_blocks = normalize_blocks(parsed.raw_pages, parser_engine="plaintext")
            fallback_blocks = build_section_paths(
                fallback_blocks,
                doc_strategy=state.get("doc_strategy", "general"),
            )
            for block in fallback_blocks:
                block["metadata"] = {
                    **(block.get("metadata") or {}),
                    "fallback_from": "vision_layout",
                    "fallback_reason": "low_parse_quality",
                }

            fallback_quality = evaluate_parse_quality(blocks=fallback_blocks, parsed_pages=parsed.raw_pages)
            fallback_note = (
                "Auto fallback: parser_engine switched from vision_layout to plaintext "
                f"(score {quality['parse_quality_score']} -> {fallback_quality['parse_quality_score']})."
            )
            file_meta = dict(state.get("file_meta", {}))
            file_meta["fallback"] = {
                "from": "vision_layout",
                "to": "plaintext",
                "reason": "low_parse_quality",
                "from_score": quality["parse_quality_score"],
                "to_score": fallback_quality["parse_quality_score"],
            }
            return {
                "parser_engine": "plaintext",
                "parsed_pages": parsed.raw_pages,
                "normalized_blocks": fallback_blocks,
                "parse_quality_score": fallback_quality["parse_quality_score"],
                "quality_metrics": fallback_quality["quality_metrics"],
                "requires_review": fallback_quality["requires_review"],
                "file_meta": file_meta,
                "errors": [*state.get("errors", []), fallback_note],
            }

        return updates

    def build_chunks(self, state: ParseState) -> ParseState:
        chunker = build_chunker(state["doc_strategy"])
        chunks = chunker.build(
            doc_id=state["doc_id"],
            filename=state["filename"],
            blocks=state.get("normalized_blocks", []),
        )
        return {"chunks": chunks}

    def write_doc_store(self, state: ParseState) -> ParseState:
        self._upsert_manager.upsert_parse_outputs(
            doc={
                "doc_id": state["doc_id"],
                "filename": state["filename"],
                "source_uri": state["source_uri"],
                "metadata": state.get("file_meta", {}),
            },
            blocks=state.get("normalized_blocks", []),
            chunks=state.get("chunks", []),
        )
        return {}
