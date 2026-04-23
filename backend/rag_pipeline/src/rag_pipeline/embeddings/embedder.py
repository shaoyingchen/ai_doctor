from __future__ import annotations


def embed_texts(rows: list[dict]) -> list[dict]:
    # Phase 1 stub vectorization: deterministic numeric vector, no external model call.
    output: list[dict] = []
    for row in rows:
        text = row.get("embedding_text", "")
        length = len(text)
        token_like = len(text.split())
        output.append(
            {
                "chunk_id": row["chunk_id"],
                "vector": [float(length), float(token_like), float(length % 97)],
                "dim": 3,
                "model": "stub-embedder",
            }
        )
    return output

