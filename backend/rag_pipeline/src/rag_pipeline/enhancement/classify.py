from __future__ import annotations


def _classify_topic(chunk: dict) -> str:
    chunk_type = (chunk.get("chunk_type") or "").lower()
    content = (chunk.get("content") or "").lower()
    if chunk_type == "table":
        return "table_data"
    if chunk_type == "slide":
        return "presentation"
    if any(token in content for token in ("error", "exception", "failed", "失败", "错误")):
        return "issue_diagnosis"
    if any(token in content for token in ("install", "步骤", "how to", "使用")):
        return "procedure"
    return "general_knowledge"


def classify_chunks(chunks: list[dict]) -> list[dict]:
    """Attach deterministic usage/category labels to each chunk."""
    classified: list[dict] = []
    for chunk in chunks:
        row = dict(chunk)
        content_length = len((chunk.get("content") or "").strip())
        row["usage_tag"] = "qa_candidate" if content_length >= 48 else "context_only"
        row["content_category"] = _classify_topic(chunk)
        row["classification_confidence"] = 0.85 if content_length >= 48 else 0.6
        classified.append(row)
    return classified
