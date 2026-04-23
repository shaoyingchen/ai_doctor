from __future__ import annotations

from pathlib import Path


def inspect_file(filename: str, file_bytes: bytes) -> dict:
    ext = Path(filename).suffix.lower()
    return {
        "ext": ext,
        "size": len(file_bytes),
        # Phase 1 keeps scanned-PDF detection simple to ensure plaintext path works for txt/pdf.
        "is_scanned": False,
        "page_count": 1,
        "lang": "zh",
        "has_tables": False,
        "has_figures": False,
    }
