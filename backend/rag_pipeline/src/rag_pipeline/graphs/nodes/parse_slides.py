from __future__ import annotations

from typing import Any

from rag_pipeline.parsers.registry import build_parser


def parse_slides_node(state: dict[str, Any]) -> dict[str, Any]:
    """Parse ppt/pptx content into per-slide raw pages."""
    parser = build_parser(state["parser_engine"])
    parsed = parser.parse(file_bytes=state["file_bytes"], filename=state["filename"], metadata=state["file_meta"])
    return {"parsed_pages": parsed.raw_pages}

