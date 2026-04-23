from __future__ import annotations

from rag_pipeline.parsers.base import ParseResult


class VisionLayoutParser:
    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict) -> ParseResult:
        page = {
            "page_no": 1,
            "blocks": [
                {"type": "title", "text": "文档标题", "bbox": [0.1, 0.1, 0.8, 0.15], "order": 1},
                {"type": "text", "text": "正文内容占位", "bbox": [0.1, 0.2, 0.9, 0.8], "order": 2},
            ],
        }
        return ParseResult(raw_pages=[page], raw_blocks=page["blocks"], tables=[], figures=[])

