from __future__ import annotations


def generalize_questions(qa_pairs: list[dict]) -> list[dict]:
    """Generate two template variants per original QA question."""
    rows: list[dict] = []
    for qa in qa_pairs:
        original = qa["question"]
        rows.append(
            {
                "qa_id": qa["qa_id"],
                "chunk_id": qa["chunk_id"],
                "original_question": original,
                "variants": [
                    f"Could you summarize the main idea? ({original})",
                    f"Please provide a formal summary of the central point. ({original})",
                ],
            }
        )
    return rows

