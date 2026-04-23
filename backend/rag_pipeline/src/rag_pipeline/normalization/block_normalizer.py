from __future__ import annotations

from rag_pipeline.utils.ids import new_id


def normalize_blocks(raw_pages: list[dict], parser_engine: str) -> list[dict]:
    blocks: list[dict] = []
    for page in raw_pages:
        for index, raw in enumerate(page.get("blocks", []), start=1):
            blocks.append(
                {
                    "block_id": new_id("blk"),
                    "page_no": page.get("page_no"),
                    "type": raw.get("type", "text"),
                    "text": raw.get("text", ""),
                    "bbox": raw.get("bbox"),
                    "reading_order": raw.get("order", index),
                    "section_path": [],
                    "confidence": raw.get("confidence", 0.95),
                    "source_engine": parser_engine,
                    "metadata": {},
                }
            )
    return blocks

