from __future__ import annotations

from rag_pipeline.chunking.general import GeneralChunkBuilder
from rag_pipeline.chunking.manual import ManualChunkBuilder
from rag_pipeline.chunking.presentation import PresentationChunkBuilder
from rag_pipeline.chunking.table import TableChunkBuilder

CHUNKER_REGISTRY = {
    "general": GeneralChunkBuilder,
    "paper": GeneralChunkBuilder,
    "manual": ManualChunkBuilder,
    "presentation": PresentationChunkBuilder,
    "qa": GeneralChunkBuilder,
    "table": TableChunkBuilder,
    "laws": GeneralChunkBuilder,
}


def build_chunker(strategy: str):
    return CHUNKER_REGISTRY[strategy]()
