from __future__ import annotations

from rag_pipeline.storage.doc_store import DocStore
from rag_pipeline.storage.graph_store import GraphStore
from rag_pipeline.storage.vector_store import VectorStore


class UpsertManager:
    def __init__(self, *, doc_store: DocStore, vector_store: VectorStore, graph_store: GraphStore) -> None:
        self.doc_store = doc_store
        self.vector_store = vector_store
        self.graph_store = graph_store

    def upsert_parse_outputs(self, *, doc: dict, blocks: list[dict], chunks: list[dict]) -> None:
        doc_id = doc["doc_id"]
        self.doc_store.upsert_document(doc)
        self.doc_store.upsert_blocks(doc_id, blocks)
        self.doc_store.upsert_chunks(doc_id, chunks)

    def upsert_enhance_outputs(
        self,
        *,
        doc_id: str,
        chunks: list[dict],
        embeddings: list[dict],
        entities: list[dict],
        relations: list[dict],
    ) -> None:
        self.doc_store.upsert_chunks(doc_id, chunks)
        self.vector_store.upsert_embeddings(doc_id, embeddings)
        self.graph_store.upsert_entities(doc_id, entities)
        self.graph_store.upsert_relations(doc_id, relations)

