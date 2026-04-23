from __future__ import annotations

import re
from io import BytesIO
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

from rag_pipeline.parsers.base import ParseResult


def _sheet_index(path: str) -> int:
    matched = re.search(r"sheet(\d+)\.xml$", path)
    return int(matched.group(1)) if matched else 10**9


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-8", "gb18030", "utf-16"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def _extract_shared_strings(archive: ZipFile) -> list[str]:
    try:
        root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    values: list[str] = []
    for item in root.findall(".//{*}si"):
        texts = [node.text or "" for node in item.findall(".//{*}t")]
        values.append("".join(texts).strip())
    return values


class ExcelParser:
    """Parse xlsx/xls into sheet-based table-row blocks."""

    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict) -> ParseResult:
        pages: list[dict] = []
        tables: list[dict] = []
        ext = metadata.get("ext", "")

        if ext == ".xlsx":
            try:
                with ZipFile(BytesIO(file_bytes)) as archive:
                    shared_strings = _extract_shared_strings(archive)
                    sheet_paths = sorted(
                        [name for name in archive.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")],
                        key=_sheet_index,
                    )
                    for page_no, path in enumerate(sheet_paths, 1):
                        root = ET.fromstring(archive.read(path))
                        rows: list[str] = []
                        for row in root.findall(".//{*}sheetData/{*}row"):
                            cells: list[str] = []
                            for cell in row.findall("{*}c"):
                                cell_type = cell.attrib.get("t")
                                value_node = cell.find("{*}v")
                                if value_node is None or value_node.text is None:
                                    continue
                                raw_value = value_node.text.strip()
                                if cell_type == "s" and raw_value.isdigit():
                                    string_index = int(raw_value)
                                    if 0 <= string_index < len(shared_strings):
                                        cells.append(shared_strings[string_index])
                                    else:
                                        cells.append(raw_value)
                                else:
                                    cells.append(raw_value)
                            line = " | ".join(value for value in cells if value)
                            if line:
                                rows.append(line)

                        if not rows:
                            rows = [f"empty sheet {page_no} from {filename}"]

                        blocks = [
                            {"type": "table_row", "text": row_text, "bbox": None, "order": order}
                            for order, row_text in enumerate(rows, 1)
                        ]
                        pages.append({"page_no": page_no, "blocks": blocks})
                        tables.append({"table_id": f"tbl_{page_no}", "page_no": page_no, "row_count": len(rows)})
            except (ET.ParseError, BadZipFile):
                pages = []
                tables = []

        if not pages:
            text = _decode_text(file_bytes).strip() or f"empty table from {filename}"
            pages = [{"page_no": 1, "blocks": [{"type": "table_row", "text": text, "bbox": None, "order": 1}]}]
            tables = [{"table_id": "tbl_1", "page_no": 1, "row_count": 1}]

        raw_blocks = [block for page in pages for block in page["blocks"]]
        return ParseResult(raw_pages=pages, raw_blocks=raw_blocks, tables=tables, figures=[])

