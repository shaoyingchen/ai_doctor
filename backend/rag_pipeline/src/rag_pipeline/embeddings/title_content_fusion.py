from __future__ import annotations


def build_embedding_text(chunk: dict) -> str:
    title = chunk.get("title", "").strip()
    content = chunk.get("content", "").strip()
    return f"{title}\n{content}".strip()

