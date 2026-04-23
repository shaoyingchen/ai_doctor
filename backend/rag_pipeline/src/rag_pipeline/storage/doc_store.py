from __future__ import annotations

from typing import Protocol


class DocStore(Protocol):
    def upsert_document(self, doc: dict) -> None: ...
    def upsert_blocks(self, doc_id: str, blocks: list[dict]) -> None: ...
    def upsert_chunks(self, doc_id: str, chunks: list[dict]) -> None: ...
    def load_chunks(self, doc_id: str) -> list[dict]: ...


class InMemoryDocStore:
    def __init__(self) -> None:
        self.documents: dict[str, dict] = {}
        self.blocks: dict[str, list[dict]] = {}
        self.chunks: dict[str, list[dict]] = {}

    def upsert_document(self, doc: dict) -> None:
        self.documents[doc["doc_id"]] = doc

    def upsert_blocks(self, doc_id: str, blocks: list[dict]) -> None:
        self.blocks[doc_id] = blocks

    def upsert_chunks(self, doc_id: str, chunks: list[dict]) -> None:
        self.chunks[doc_id] = chunks

    def load_chunks(self, doc_id: str) -> list[dict]:
        return self.chunks.get(doc_id, [])

