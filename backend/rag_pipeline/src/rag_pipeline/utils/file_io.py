from __future__ import annotations

from pathlib import Path


def read_bytes(uri: str) -> bytes:
    return Path(uri).read_bytes()

