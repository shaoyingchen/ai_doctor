from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


@dataclass
class ParseResult:
    raw_pages: list[dict[str, Any]]
    raw_blocks: list[dict[str, Any]]
    tables: list[dict[str, Any]]
    figures: list[dict[str, Any]]


class Parser(Protocol):
    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict[str, Any]) -> ParseResult: ...

