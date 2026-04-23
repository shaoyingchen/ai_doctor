from __future__ import annotations

from typing import Protocol


class GraphStore(Protocol):
    def upsert_entities(self, doc_id: str, entities: list[dict]) -> None: ...
    def upsert_relations(self, doc_id: str, relations: list[dict]) -> None: ...


class InMemoryGraphStore:
    def __init__(self) -> None:
        self.entities: dict[str, list[dict]] = {}
        self.relations: dict[str, list[dict]] = {}

    def upsert_entities(self, doc_id: str, entities: list[dict]) -> None:
        self.entities[doc_id] = entities

    def upsert_relations(self, doc_id: str, relations: list[dict]) -> None:
        self.relations[doc_id] = relations

