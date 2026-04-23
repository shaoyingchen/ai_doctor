from __future__ import annotations

from typing import Any, Callable

from rag_pipeline.storage.graph_store import GraphStore


def build_write_graph_store_node(graph_store: GraphStore) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """Create graph node that writes entities/relations to graph store."""

    def write_graph_store_node(state: dict[str, Any]) -> dict[str, Any]:
        entities = state.get("entities", [])
        relations = state.get("relations", [])
        graph_store.upsert_entities(state["doc_id"], entities)
        graph_store.upsert_relations(state["doc_id"], relations)
        return {}

    return write_graph_store_node

