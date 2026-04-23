from __future__ import annotations

import re
from typing import Any


_NUMBERED_HEADING = re.compile(r"^\s*(\d+(?:\.\d+)*)[\s、.)-]+")


def _heading_level(block: dict[str, Any], text: str) -> int | None:
    block_type = (block.get("type") or "").lower()
    if block_type == "title":
        return 1

    markdown_match = re.match(r"^\s*(#{1,6})\s+\S+", text)
    if markdown_match:
        return len(markdown_match.group(1))

    numbered_match = _NUMBERED_HEADING.match(text)
    if numbered_match:
        return numbered_match.group(1).count(".") + 1

    if block_type == "heading":
        return 2

    return None


def build_section_paths(blocks: list[dict[str, Any]], *, doc_strategy: str) -> list[dict[str, Any]]:
    """Assign section_path for blocks; manual strategy uses heading hierarchy."""
    if doc_strategy != "manual":
        return blocks

    section_stack: list[str] = []
    root_title: str | None = None
    updated_blocks: list[dict[str, Any]] = []

    for block in blocks:
        row = dict(block)
        text = (row.get("text") or "").strip()
        level = _heading_level(row, text)

        if level is not None and text:
            title = re.sub(r"^\s*#{1,6}\s*", "", text).strip()
            numbered_match = _NUMBERED_HEADING.match(title)
            if numbered_match:
                title = title[numbered_match.end() :].strip() or title

            block_type = (row.get("type") or "").lower()
            if block_type == "title":
                root_title = title
                section_stack = [title]
            else:
                base_depth = 1 if root_title else 0
                keep = base_depth + max(level - 1, 0)
                section_stack = section_stack[:keep]
                section_stack.append(title)

            row["metadata"] = {**(row.get("metadata") or {}), "heading_level": level}

        row["section_path"] = section_stack.copy()
        updated_blocks.append(row)

    return updated_blocks
