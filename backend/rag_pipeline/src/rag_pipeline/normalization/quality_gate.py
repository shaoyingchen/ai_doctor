from __future__ import annotations

from typing import Any


def evaluate_parse_quality(
    *,
    blocks: list[dict[str, Any]],
    parsed_pages: list[dict[str, Any]],
) -> dict[str, Any]:
    """Calculate parse quality score using four dimensions."""
    block_count = len(blocks)
    non_empty_blocks = sum(1 for block in blocks if (block.get("text") or "").strip())
    total_pages = max(len(parsed_pages), 1)
    pages_with_text = len(
        {
            block.get("page_no")
            for block in blocks
            if (block.get("text") or "").strip() and block.get("page_no") is not None
        }
    )

    block_count_score = min(1.0, block_count / 4.0)
    text_coverage = (non_empty_blocks / block_count) if block_count else 0.0
    empty_text_rate = 1.0 - text_coverage if block_count else 1.0
    page_coverage = min(1.0, pages_with_text / total_pages)

    score = round(
        0.25 * block_count_score
        + 0.30 * text_coverage
        + 0.20 * (1.0 - empty_text_rate)
        + 0.25 * page_coverage,
        4,
    )
    requires_review = score < 0.7

    return {
        "parse_quality_score": score,
        "requires_review": requires_review,
        "quality_metrics": {
            "block_count": block_count,
            "block_count_score": round(block_count_score, 4),
            "text_coverage": round(text_coverage, 4),
            "empty_text_rate": round(empty_text_rate, 4),
            "page_coverage": round(page_coverage, 4),
            "non_empty_blocks": non_empty_blocks,
            "pages_with_text": pages_with_text,
            "total_pages": total_pages,
        },
    }

