from __future__ import annotations


def route_for_qa(chunks: list[dict]) -> str:
    """Return QA branch key based on chunk usage tags."""
    return "generate_qa" if any(chunk.get("usage_tag") == "qa_candidate" for chunk in chunks) else "skip_qa"


def generate_qa_pairs(chunks: list[dict]) -> list[dict]:
    """Generate one template QA per QA-candidate chunk, preserving chunk_id linkage."""
    qa_rows: list[dict] = []
    for chunk in chunks:
        if chunk.get("usage_tag") != "qa_candidate":
            continue
        title = (chunk.get("title") or "").strip()
        content = (chunk.get("content") or "").strip()
        question = f"What is the key point of '{title}'?" if title else "What is the key point of this chunk?"
        qa_rows.append(
            {
                "qa_id": f'qa_{chunk["chunk_id"]}',
                "chunk_id": chunk["chunk_id"],
                "question": question,
                "answer": content[:220],
                "source": "template_rule",
            }
        )
    return qa_rows

