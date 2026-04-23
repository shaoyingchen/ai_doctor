from __future__ import annotations

from typing import Any, TypedDict

from rag_pipeline.enhancement.classify import classify_chunks
from rag_pipeline.enhancement.entities import extract_entities
from rag_pipeline.enhancement.keywords import extract_keywords
from rag_pipeline.enhancement.qa_generation import generate_qa_pairs, route_for_qa
from rag_pipeline.enhancement.question_generalization import generalize_questions
from rag_pipeline.enhancement.summary import summarize_chunks
from rag_pipeline.graphs.nodes.embed_chunks import embed_chunks_node
from rag_pipeline.graphs.nodes.write_graph_store import build_write_graph_store_node
from rag_pipeline.graphs.nodes.write_vector_store import build_write_vector_store_node
from rag_pipeline.storage.doc_store import DocStore
from rag_pipeline.storage.graph_store import GraphStore
from rag_pipeline.storage.vector_store import VectorStore

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


class EnhanceState(TypedDict, total=False):
    doc_id: str
    chunks: list[dict[str, Any]]
    entities: list[dict[str, Any]]
    keywords: list[dict[str, Any]]
    summaries: list[dict[str, Any]]
    qa_pairs: list[dict[str, Any]]
    question_variants: list[dict[str, Any]]
    embeddings: list[dict[str, Any]]
    relations: list[dict[str, Any]]
    enhance_quality_score: float
    requires_review: bool
    errors: list[str]


class EnhanceIndexGraph:
    """Enhance chunks and write in-memory index stores."""

    def __init__(self, *, doc_store: DocStore, vector_store: VectorStore, graph_store: GraphStore) -> None:
        self._doc_store = doc_store
        self._write_vector_store_node = build_write_vector_store_node(vector_store)
        self._write_graph_store_node = build_write_graph_store_node(graph_store)
        self._compiled = self._build_graph().compile()

    def run(self, doc_id: str) -> dict[str, Any]:
        state = self._compiled.invoke(
            {
                "doc_id": doc_id,
                "errors": [],
                "relations": [],
            }
        )
        return {
            "doc_id": doc_id,
            "chunks": state.get("chunks", []),
            "entities": state.get("entities", []),
            "keywords": state.get("keywords", []),
            "summaries": state.get("summaries", []),
            "qa_pairs": state.get("qa_pairs", []),
            "question_variants": state.get("question_variants", []),
            "embeddings": state.get("embeddings", []),
            "enhance_quality_score": state.get("enhance_quality_score", 0.0),
            "requires_review": state.get("requires_review", True),
            "errors": state.get("errors", []),
        }

    def _build_graph(self) -> StateGraph:
        graph = StateGraph(EnhanceState)
        graph.add_node("load_chunks", self.load_chunks)
        graph.add_node("classify_chunks", self.classify_chunks)
        graph.add_node("extract_keywords", self.extract_keywords)
        graph.add_node("extract_entities", self.extract_entities)
        graph.add_node("summarize_chunks", self.summarize_chunks)
        graph.add_node("generate_qa", self.generate_qa)
        graph.add_node("generate_question_variants", self.generate_question_variants)
        graph.add_node("skip_qa", self.skip_qa)
        graph.add_node("embed_chunks", embed_chunks_node)
        graph.add_node("write_vector_store", self._write_vector_store_node)
        graph.add_node("write_graph_store", self._write_graph_store_node)
        graph.add_node("write_doc_store", self.write_doc_store)
        graph.add_node("evaluate", self.evaluate)

        graph.add_edge(START, "load_chunks")
        graph.add_edge("load_chunks", "classify_chunks")
        graph.add_edge("classify_chunks", "extract_keywords")
        graph.add_edge("extract_keywords", "extract_entities")
        graph.add_edge("extract_entities", "summarize_chunks")
        graph.add_conditional_edges(
            "summarize_chunks",
            self.route_for_qa,
            {"generate_qa": "generate_qa", "skip_qa": "skip_qa"},
        )
        graph.add_edge("generate_qa", "generate_question_variants")
        graph.add_edge("generate_question_variants", "embed_chunks")
        graph.add_edge("skip_qa", "embed_chunks")
        graph.add_edge("embed_chunks", "write_vector_store")
        graph.add_edge("write_vector_store", "write_graph_store")
        graph.add_edge("write_graph_store", "write_doc_store")
        graph.add_edge("write_doc_store", "evaluate")
        graph.add_edge("evaluate", END)
        return graph

    def load_chunks(self, state: EnhanceState) -> EnhanceState:
        chunks = self._doc_store.load_chunks(state["doc_id"])
        if not chunks:
            return {"chunks": [], "errors": [*state.get("errors", []), f"No chunks found for doc_id={state['doc_id']}"]}
        return {"chunks": chunks}

    def classify_chunks(self, state: EnhanceState) -> EnhanceState:
        chunks = classify_chunks(state.get("chunks", []))
        return {"chunks": chunks}

    def extract_keywords(self, state: EnhanceState) -> EnhanceState:
        keywords = extract_keywords(state.get("chunks", []))
        by_chunk_id = {row["chunk_id"]: row["keywords"] for row in keywords}
        chunks = []
        for chunk in state.get("chunks", []):
            row = dict(chunk)
            row["keywords"] = by_chunk_id.get(chunk["chunk_id"], [])
            chunks.append(row)
        return {"keywords": keywords, "chunks": chunks}

    def extract_entities(self, state: EnhanceState) -> EnhanceState:
        entities = extract_entities(state.get("chunks", []))
        entity_ids_by_chunk: dict[str, list[str]] = {}
        for entity in entities:
            chunk_id = entity.get("metadata", {}).get("chunk_id")
            if not chunk_id:
                continue
            entity_ids_by_chunk.setdefault(chunk_id, []).append(entity["entity_id"])
        chunks = []
        for chunk in state.get("chunks", []):
            row = dict(chunk)
            row["entity_ids"] = entity_ids_by_chunk.get(chunk["chunk_id"], [])
            chunks.append(row)
        return {"entities": entities, "chunks": chunks}

    def summarize_chunks(self, state: EnhanceState) -> EnhanceState:
        summaries = summarize_chunks(state.get("chunks", []))
        by_chunk_id = {row["chunk_id"]: row["summary"] for row in summaries}
        chunks = []
        for chunk in state.get("chunks", []):
            row = dict(chunk)
            row["summary"] = by_chunk_id.get(chunk["chunk_id"], "")
            chunks.append(row)
        return {"summaries": summaries, "chunks": chunks}

    def route_for_qa(self, state: EnhanceState) -> str:
        return route_for_qa(state.get("chunks", []))

    def generate_qa(self, state: EnhanceState) -> EnhanceState:
        qa_pairs = generate_qa_pairs(state.get("chunks", []))
        return {"qa_pairs": qa_pairs}

    def generate_question_variants(self, state: EnhanceState) -> EnhanceState:
        question_variants = generalize_questions(state.get("qa_pairs", []))
        return {"question_variants": question_variants}

    def skip_qa(self, _state: EnhanceState) -> EnhanceState:
        return {"qa_pairs": [], "question_variants": []}

    def write_doc_store(self, state: EnhanceState) -> EnhanceState:
        self._doc_store.upsert_chunks(state["doc_id"], state.get("chunks", []))
        return {}

    def evaluate(self, state: EnhanceState) -> EnhanceState:
        chunks = state.get("chunks", [])
        embeddings = state.get("embeddings", [])
        entities = state.get("entities", [])
        if not chunks:
            return {"enhance_quality_score": 0.0, "requires_review": True}
        coverage = len(embeddings) / len(chunks)
        entity_density = min(1.0, len(entities) / max(len(chunks) * 2, 1))
        score = round(0.7 * coverage + 0.3 * entity_density, 4)
        return {"enhance_quality_score": score, "requires_review": score < 0.6}
