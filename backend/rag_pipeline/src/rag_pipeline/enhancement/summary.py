from __future__ import annotations

import re


def summarize_chunks(chunks: list[dict]) -> list[dict]:
    """Create deterministic short summaries from chunk content."""
    rows: list[dict] = []
    for chunk in chunks:
        content = (chunk.get("content") or "").strip()
        if not content:
            summary = ""
        else:
            sentences = [part.strip() for part in re.split(r"[。！？.!?]\s*", content) if part.strip()]
            summary = (sentences[0] if sentences else content)[:160]
        rows.append({"chunk_id": chunk["chunk_id"], "summary": summary})
    return rows
