from __future__ import annotations

from typing import Protocol


class VectorStore(Protocol):
    def upsert_embeddings(self, doc_id: str, embeddings: list[dict]) -> None: ...


class InMemoryVectorStore:
    def __init__(self) -> None:
        self.rows: dict[str, list[dict]] = {}

    def upsert_embeddings(self, doc_id: str, embeddings: list[dict]) -> None:
        self.rows[doc_id] = embeddings

