from __future__ import annotations

import re
from io import BytesIO
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

from rag_pipeline.parsers.base import ParseResult


def _slide_index(path: str) -> int:
    matched = re.search(r"slide(\d+)\.xml$", path)
    return int(matched.group(1)) if matched else 10**9


class PptxParser:
    """Parse pptx/ppt into per-slide raw text blocks."""

    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict) -> ParseResult:
        pages: list[dict] = []
        ext = metadata.get("ext", "")

        if ext == ".pptx":
            try:
                with ZipFile(BytesIO(file_bytes)) as archive:
                    slide_names = sorted(
                        [name for name in archive.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")],
                        key=_slide_index,
                    )
                    for page_no, slide_name in enumerate(slide_names, 1):
                        root = ET.fromstring(archive.read(slide_name))
                        lines = [node.text.strip() for node in root.findall(".//{*}t") if node.text and node.text.strip()]
                        if not lines:
                            lines = [f"empty slide {page_no} from {filename}"]
                        blocks = [
                            {"type": "text", "text": line, "bbox": None, "order": order}
                            for order, line in enumerate(lines, 1)
                        ]
                        pages.append({"page_no": page_no, "blocks": blocks})
            except (ET.ParseError, BadZipFile):
                pages = []

        if not pages:
            text = file_bytes.decode("utf-8", errors="ignore").strip() or f"empty content from {filename}"
            pages = [{"page_no": 1, "blocks": [{"type": "text", "text": text, "bbox": None, "order": 1}]}]

        raw_blocks = [block for page in pages for block in page["blocks"]]
        return ParseResult(raw_pages=pages, raw_blocks=raw_blocks, tables=[], figures=[])

