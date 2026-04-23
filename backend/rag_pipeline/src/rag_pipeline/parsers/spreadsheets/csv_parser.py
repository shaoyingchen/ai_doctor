from __future__ import annotations

import csv
from io import StringIO

from rag_pipeline.parsers.base import ParseResult


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "gb18030", "utf-16"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


class CsvParser:
    """Parse csv text into table-row blocks."""

    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict) -> ParseResult:
        text = _decode_text(file_bytes)
        reader = csv.reader(StringIO(text))
        rows = [" | ".join(cell.strip() for cell in row if cell and cell.strip()) for row in reader]
        rows = [row for row in rows if row]
        if not rows:
            rows = [f"empty table from {filename}"]

        blocks = [{"type": "table_row", "text": row, "bbox": None, "order": index} for index, row in enumerate(rows, 1)]
        page = {"page_no": 1, "blocks": blocks}
        return ParseResult(
            raw_pages=[page],
            raw_blocks=blocks,
            tables=[{"table_id": "tbl_1", "page_no": 1, "row_count": len(rows)}],
            figures=[],
        )

