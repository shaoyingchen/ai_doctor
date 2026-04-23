from __future__ import annotations

from io import BytesIO
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

from rag_pipeline.parsers.base import ParseResult


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "utf-16", "gb18030"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


class DocxParser:
    """Parse docx/doc into raw text blocks for downstream normalization."""

    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict) -> ParseResult:
        paragraphs: list[str] = []
        ext = metadata.get("ext", "")

        if ext == ".docx":
            try:
                with ZipFile(BytesIO(file_bytes)) as archive:
                    xml_bytes = archive.read("word/document.xml")
                root = ET.fromstring(xml_bytes)
                namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                for paragraph in root.findall(".//w:p", namespace):
                    texts = [text_node.text or "" for text_node in paragraph.findall(".//w:t", namespace)]
                    line = "".join(texts).strip()
                    if line:
                        paragraphs.append(line)
            except (KeyError, ET.ParseError, BadZipFile):
                paragraphs = []

        if not paragraphs:
            fallback = _decode_text(file_bytes).replace("\r\n", "\n").replace("\r", "\n")
            paragraphs = [line.strip() for line in fallback.split("\n") if line.strip()]

        if not paragraphs:
            paragraphs = [f"empty content from {filename}"]

        blocks = [{"type": "text", "text": line, "bbox": None, "order": index} for index, line in enumerate(paragraphs, 1)]
        page = {"page_no": 1, "blocks": blocks}
        return ParseResult(raw_pages=[page], raw_blocks=blocks, tables=[], figures=[])

