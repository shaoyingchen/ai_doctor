from __future__ import annotations

from typing import Any

from rag_pipeline.embeddings.embedder import embed_texts
from rag_pipeline.embeddings.title_content_fusion import build_embedding_text


def embed_chunks_node(state: dict[str, Any]) -> dict[str, Any]:
    """Build embedding text and generate vectors with stub embedder."""
    chunks = state.get("chunks", [])
    embedding_rows = [{"chunk_id": chunk["chunk_id"], "embedding_text": build_embedding_text(chunk)} for chunk in chunks]
    embeddings = embed_texts(embedding_rows)
    return {"embeddings": embeddings}

