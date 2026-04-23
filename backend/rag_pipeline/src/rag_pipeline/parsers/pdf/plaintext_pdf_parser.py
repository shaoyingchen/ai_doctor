from __future__ import annotations

import re
from io import BytesIO

from rag_pipeline.parsers.base import ParseResult

MAX_PAGE_CHARS = 1800


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "gb18030"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def _extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from simple text-based PDFs with best-effort fallbacks."""
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(BytesIO(file_bytes))
        pages: list[str] = []
        for page in reader.pages:
            text = (page.extract_text() or "").strip()
            if text:
                pages.append(text)
        if pages:
            return "\f".join(pages)
    except Exception:
        pass

    decoded = file_bytes.decode("latin-1", errors="ignore")
    literal_chunks = re.findall(r"\((.*?)\)\s*Tj", decoded, flags=re.DOTALL)
    if literal_chunks:
        return "\n".join(chunk.replace("\\n", "\n").replace("\\r", "\n").strip() for chunk in literal_chunks)
    return ""


class PlaintextPdfParser:
    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict) -> ParseResult:
        ext = metadata.get("ext", "")
        if ext == ".pdf":
            decoded = _extract_pdf_text(file_bytes)
            if not decoded.strip():
                decoded = _decode_text(file_bytes)
        else:
            decoded = _decode_text(file_bytes)

        decoded = decoded.replace("\r\n", "\n")
        decoded = decoded.replace("\r", "\n").strip()

        if not decoded:
            # Phase 1 keeps a deterministic fallback and avoids external OCR dependency.
            decoded = f"stub text from {filename}" if ext == ".pdf" else ""

        page_texts: list[str]
        if "\f" in decoded:
            page_texts = [page.strip() for page in decoded.split("\f") if page.strip()]
        else:
            page_texts = [decoded[i : i + MAX_PAGE_CHARS].strip() for i in range(0, len(decoded), MAX_PAGE_CHARS)]
            page_texts = [page for page in page_texts if page]

        if not page_texts:
            page_texts = [f"empty content from {filename}"]

        pages: list[dict] = []
        all_blocks: list[dict] = []
        for page_index, page_text in enumerate(page_texts, start=1):
            lines = [line.strip() for line in page_text.split("\n") if line.strip()]
            if not lines:
                lines = [page_text]

            blocks = [
                {
                    "type": "text",
                    "text": line,
                    "bbox": None,
                    "order": order_index,
                }
                for order_index, line in enumerate(lines, start=1)
            ]
            pages.append({"page_no": page_index, "blocks": blocks})
            all_blocks.extend(blocks)

        return ParseResult(raw_pages=pages, raw_blocks=all_blocks, tables=[], figures=[])
