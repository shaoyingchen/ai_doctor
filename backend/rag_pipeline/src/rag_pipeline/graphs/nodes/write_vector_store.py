from __future__ import annotations

from typing import Any, Callable

from rag_pipeline.storage.vector_store import VectorStore


def build_write_vector_store_node(vector_store: VectorStore) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """Create graph node that writes embeddings to vector store."""

    def write_vector_store_node(state: dict[str, Any]) -> dict[str, Any]:
        vector_store.upsert_embeddings(state["doc_id"], state.get("embeddings", []))
        return {}

    return write_vector_store_node

