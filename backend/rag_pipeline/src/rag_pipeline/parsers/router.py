from __future__ import annotations


def select_strategy(file_meta: dict, parser_preferences: dict) -> tuple[str, str]:
    ext = file_meta["ext"]
    preferred_strategy = parser_preferences.get("doc_strategy")
    preferred_engine = parser_preferences.get("parser_engine")

    if preferred_strategy and preferred_engine:
        return preferred_strategy, preferred_engine

    if ext == ".pdf":
        if file_meta.get("is_scanned"):
            return "manual", "vision_layout"
        return "general", "plaintext"
    if ext in {".docx", ".doc"}:
        return "manual", "docx_native"
    if ext in {".pptx", ".ppt"}:
        return "presentation", "pptx_native"
    if ext in {".xlsx", ".xls"}:
        return "table", "sheet_native"
    if ext == ".csv":
        return "table", "csv_native"
    return "general", "plaintext"


def route_by_file_type(file_meta: dict) -> str:
    """Route file extensions to parse graph node names."""
    ext = file_meta.get("ext", "").lower()
    if ext in {".docx", ".doc"}:
        return "parse_docx"
    if ext in {".pptx", ".ppt"}:
        return "parse_slides"
    if ext in {".xlsx", ".xls", ".csv"}:
        return "parse_spreadsheet"
    return "parse_pdf"
