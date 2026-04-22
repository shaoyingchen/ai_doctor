# LangGraph RAG Pipeline Scaffold

> 目标：提供一套可直接交给 Codex 继续实现的工程骨架。
> 范围：ParseGraph + EnhanceIndexGraph + 基础存储抽象 + API/脚本入口。

## 1. 目录结构

```text
rag_pipeline/
├── pyproject.toml
├── .env.example
├── README.md
├── configs/
│   ├── app.yaml
│   ├── parser_profiles.yaml
│   ├── chunking_profiles.yaml
│   ├── taxonomy.yaml
│   └── prompts/
│       ├── classify_chunk.jinja2
│       ├── extract_entities.jinja2
│       ├── extract_keywords.jinja2
│       ├── generate_qa.jinja2
│       └── generalize_questions.jinja2
├── scripts/
│   ├── run_parse.py
│   ├── run_enhance.py
│   └── run_end_to_end.py
├── src/
│   └── rag_pipeline/
│       ├── __init__.py
│       ├── settings.py
│       ├── logging.py
│       ├── constants.py
│       ├── exceptions.py
│       ├── utils/
│       │   ├── __init__.py
│       │   ├── ids.py
│       │   ├── hashing.py
│       │   ├── text.py
│       │   ├── mime.py
│       │   └── file_io.py
│       ├── schemas/
│       │   ├── __init__.py
│       │   ├── blocks.py
│       │   ├── chunks.py
│       │   ├── entities.py
│       │   ├── qa.py
│       │   └── state.py
│       ├── storage/
│       │   ├── __init__.py
│       │   ├── blob_store.py
│       │   ├── doc_store.py
│       │   ├── vector_store.py
│       │   ├── graph_store.py
│       │   └── checkpoints.py
│       ├── parsers/
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── registry.py
│       │   ├── router.py
│       │   ├── file_inspector.py
│       │   ├── pdf/
│       │   │   ├── __init__.py
│       │   │   ├── vision_layout_parser.py
│       │   │   ├── llm_ocr_parser.py
│       │   │   ├── docling_parser.py
│       │   │   ├── plaintext_pdf_parser.py
│       │   │   ├── reading_order.py
│       │   │   ├── table_extractor.py
│       │   │   └── figure_extractor.py
│       │   ├── docx/
│       │   │   ├── __init__.py
│       │   │   ├── docx_parser.py
│       │   │   └── structure_extractor.py
│       │   ├── spreadsheets/
│       │   │   ├── __init__.py
│       │   │   ├── excel_parser.py
│       │   │   ├── csv_parser.py
│       │   │   └── sheet_normalizer.py
│       │   ├── slides/
│       │   │   ├── __init__.py
│       │   │   ├── pptx_parser.py
│       │   │   └── slide_normalizer.py
│       │   └── text/
│       │       ├── __init__.py
│       │       ├── markdown_parser.py
│       │       └── html_parser.py
│       ├── normalization/
│       │   ├── __init__.py
│       │   ├── block_normalizer.py
│       │   ├── metadata_normalizer.py
│       │   ├── section_builder.py
│       │   ├── table_normalizer.py
│       │   └── figure_normalizer.py
│       ├── chunking/
│       │   ├── __init__.py
│       │   ├── base.py
│       │   ├── registry.py
│       │   ├── general.py
│       │   ├── paper.py
│       │   ├── manual.py
│       │   ├── presentation.py
│       │   ├── qa.py
│       │   ├── table.py
│       │   └── laws.py
│       ├── enhancement/
│       │   ├── __init__.py
│       │   ├── llm_client.py
│       │   ├── classify.py
│       │   ├── entities.py
│       │   ├── keywords.py
│       │   ├── summary.py
│       │   ├── qa_generation.py
│       │   ├── question_generalization.py
│       │   └── quality_review.py
│       ├── embeddings/
│       │   ├── __init__.py
│       │   ├── embedder.py
│       │   ├── title_content_fusion.py
│       │   └── batching.py
│       ├── indexing/
│       │   ├── __init__.py
│       │   ├── doc_writer.py
│       │   ├── vector_writer.py
│       │   ├── graph_writer.py
│       │   └── upsert_manager.py
│       ├── services/
│       │   ├── __init__.py
│       │   ├── document_service.py
│       │   ├── parse_service.py
│       │   ├── enhance_service.py
│       │   └── pipeline_service.py
│       ├── graphs/
│       │   ├── __init__.py
│       │   ├── parse_graph.py
│       │   ├── enhance_index_graph.py
│       │   ├── nodes/
│       │   │   ├── __init__.py
│       │   │   ├── ingest.py
│       │   │   ├── inspect.py
│       │   │   ├── select_strategy.py
│       │   │   ├── parse_pdf.py
│       │   │   ├── parse_docx.py
│       │   │   ├── parse_spreadsheet.py
│       │   │   ├── parse_slides.py
│       │   │   ├── normalize_blocks.py
│       │   │   ├── extract_tables_figures.py
│       │   │   ├── quality_gate.py
│       │   │   ├── build_chunks.py
│       │   │   ├── classify_chunks.py
│       │   │   ├── extract_entities.py
│       │   │   ├── extract_keywords.py
│       │   │   ├── summarize_chunks.py
│       │   │   ├── generate_qa.py
│       │   │   ├── generalize_questions.py
│       │   │   ├── embed_chunks.py
│       │   │   ├── write_doc_store.py
│       │   │   ├── write_vector_store.py
│       │   │   ├── write_graph_store.py
│       │   │   └── finalize.py
│       │   └── routers/
│       │       ├── __init__.py
│       │       ├── parse_routes.py
│       │       └── enhance_routes.py
│       └── api/
│           ├── __init__.py
│           ├── app.py
│           └── routes/
│               ├── __init__.py
│               ├── documents.py
│               ├── parse.py
│               ├── enhance.py
│               └── health.py
└── tests/
    ├── unit/
    └── integration/
```

## 2. pyproject.toml

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "rag-pipeline"
version = "0.1.0"
description = "LangGraph-based document parsing and enhancement pipeline"
requires-python = ">=3.11"
dependencies = [
  "langgraph>=0.2",
  "langchain-core>=0.3",
  "pydantic>=2.7",
  "pyyaml>=6.0",
  "jinja2>=3.1",
  "fastapi>=0.115",
  "uvicorn>=0.30",
  "httpx>=0.27",
  "python-dotenv>=1.0",
  "structlog>=24.1",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.0",
  "pytest-cov>=5.0",
  "mypy>=1.10",
  "ruff>=0.5",
]
pdf = [
  "pypdf>=4.2",
  "pdfplumber>=0.11",
]
docx = [
  "python-docx>=1.1",
]
slides = [
  "python-pptx>=1.0",
]
spreadsheets = [
  "openpyxl>=3.1",
  "pandas>=2.2",
]
vector = [
  "langchain-chroma>=0.1",
  "langchain-postgres>=0.0.10",
]
checkpoints = [
  "langgraph-checkpoint-sqlite>=2.0",
  "langgraph-checkpoint-postgres>=2.0",
]

[tool.ruff]
line-length = 100

[tool.pytest.ini_options]
pythonpath = ["src"]
```

## 3. 核心状态模型

### `src/rag_pipeline/schemas/state.py`

```python
from __future__ import annotations

from typing import Any, Literal, TypedDict

DocStrategy = Literal["general", "paper", "manual", "presentation", "qa", "table", "laws"]
ParserEngine = Literal["vision_layout", "ocr_llm", "docling", "plaintext", "docx_native", "pptx_native", "sheet_native"]


class ParseInputState(TypedDict):
    doc_id: str
    source_uri: str
    filename: str
    content_type: str
    parser_preferences: dict[str, Any]


class ParseState(TypedDict, total=False):
    doc_id: str
    source_uri: str
    filename: str
    content_type: str
    parser_preferences: dict[str, Any]

    file_bytes: bytes
    file_meta: dict[str, Any]
    raw_metadata: dict[str, Any]

    doc_strategy: DocStrategy
    parser_engine: ParserEngine

    raw_pages: list[dict[str, Any]]
    raw_blocks: list[dict[str, Any]]
    normalized_blocks: list[dict[str, Any]]
    tables: list[dict[str, Any]]
    figures: list[dict[str, Any]]
    images: list[dict[str, Any]]
    chunks: list[dict[str, Any]]

    parse_quality_score: float
    requires_review: bool
    errors: list[str]


class ParseOutputState(TypedDict):
    doc_id: str
    normalized_blocks: list[dict[str, Any]]
    chunks: list[dict[str, Any]]
    parse_quality_score: float
    requires_review: bool


class EnhanceInputState(TypedDict):
    doc_id: str
    chunks: list[dict[str, Any]]


class EnhanceState(TypedDict, total=False):
    doc_id: str
    chunks: list[dict[str, Any]]
    classified_chunks: list[dict[str, Any]]
    entities: list[dict[str, Any]]
    keywords: list[dict[str, Any]]
    summaries: list[dict[str, Any]]
    qa_pairs: list[dict[str, Any]]
    question_variants: list[dict[str, Any]]
    embeddings: list[dict[str, Any]]
    enhance_quality_score: float
    requires_review: bool
    errors: list[str]


class EnhanceOutputState(TypedDict):
    doc_id: str
    chunks: list[dict[str, Any]]
    embeddings: list[dict[str, Any]]
    qa_pairs: list[dict[str, Any]]
    question_variants: list[dict[str, Any]]
```

## 4. 基础 schema

### `src/rag_pipeline/schemas/blocks.py`

```python
from __future__ import annotations

from pydantic import BaseModel, Field


class Block(BaseModel):
    block_id: str
    page_no: int | None = None
    type: str
    text: str = ""
    bbox: list[float] | None = None
    reading_order: int = 0
    section_path: list[str] = Field(default_factory=list)
    confidence: float | None = None
    source_engine: str = ""
    metadata: dict = Field(default_factory=dict)
```

### `src/rag_pipeline/schemas/chunks.py`

```python
from __future__ import annotations

from pydantic import BaseModel, Field


class Chunk(BaseModel):
    chunk_id: str
    doc_id: str
    chunk_type: str = "section"
    title: str = ""
    content: str
    content_with_context: str = ""
    page_span: list[int] = Field(default_factory=list)
    section_path: list[str] = Field(default_factory=list)
    bbox_refs: list[str] = Field(default_factory=list)
    table_refs: list[str] = Field(default_factory=list)
    image_refs: list[str] = Field(default_factory=list)
    source_engine: str = ""
    metadata: dict = Field(default_factory=dict)
```

### `src/rag_pipeline/schemas/entities.py`

```python
from __future__ import annotations

from pydantic import BaseModel, Field


class Entity(BaseModel):
    entity_id: str
    text: str
    type: str
    canonical_name: str | None = None
    aliases: list[str] = Field(default_factory=list)
    confidence: float = 0.0
    metadata: dict = Field(default_factory=dict)
```

### `src/rag_pipeline/schemas/qa.py`

```python
from __future__ import annotations

from pydantic import BaseModel


class QAPair(BaseModel):
    qa_id: str
    chunk_id: str
    question: str
    answer: str
    answer_span: str | None = None
    question_type: str = "fact"
    difficulty: str = "medium"
```

## 5. 配置与工具

### `src/rag_pipeline/settings.py`

```python
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    app_name: str = "rag-pipeline"
    env: str = "dev"
    base_dir: Path = Path(__file__).resolve().parents[2]
    blob_root: str = "./data/blob"
    doc_db_url: str = "sqlite:///./data/doc_store.db"
    vector_backend: str = "chroma"
    vector_dir: str = "./data/chroma"
    checkpoint_backend: str = "memory"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
```

### `src/rag_pipeline/utils/ids.py`

```python
from __future__ import annotations

import uuid


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"
```

### `src/rag_pipeline/utils/hashing.py`

```python
from __future__ import annotations

import hashlib


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
```

### `src/rag_pipeline/utils/file_io.py`

```python
from __future__ import annotations

from pathlib import Path


def read_bytes(uri: str) -> bytes:
    path = Path(uri)
    return path.read_bytes()
```

## 6. 存储抽象

### `src/rag_pipeline/storage/doc_store.py`

```python
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
```

### `src/rag_pipeline/storage/vector_store.py`

```python
from __future__ import annotations

from typing import Protocol


class VectorStore(Protocol):
    def upsert_embeddings(self, doc_id: str, embeddings: list[dict]) -> None: ...


class InMemoryVectorStore:
    def __init__(self) -> None:
        self.rows: dict[str, list[dict]] = {}

    def upsert_embeddings(self, doc_id: str, embeddings: list[dict]) -> None:
        self.rows[doc_id] = embeddings
```

### `src/rag_pipeline/storage/graph_store.py`

```python
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
```

### `src/rag_pipeline/storage/checkpoints.py`

```python
from __future__ import annotations

from langgraph.checkpoint.memory import InMemorySaver


def build_checkpointer():
    return InMemorySaver()
```

## 7. 解析器抽象

### `src/rag_pipeline/parsers/base.py`

```python
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
```

### `src/rag_pipeline/parsers/file_inspector.py`

```python
from __future__ import annotations

from pathlib import Path


def inspect_file(filename: str, file_bytes: bytes) -> dict:
    ext = Path(filename).suffix.lower()
    return {
        "ext": ext,
        "size": len(file_bytes),
        "is_scanned": ext == ".pdf",
        "page_count": 1,
        "lang": "zh",
        "has_tables": False,
        "has_figures": False,
    }
```

### `src/rag_pipeline/parsers/router.py`

```python
from __future__ import annotations

from typing import Any


def select_strategy(file_meta: dict[str, Any], parser_preferences: dict[str, Any]) -> tuple[str, str]:
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
    if ext in {".xlsx", ".xls", ".csv"}:
        return "table", "sheet_native"
    return "general", "plaintext"
```

### `src/rag_pipeline/parsers/pdf/plaintext_pdf_parser.py`

```python
from __future__ import annotations

from rag_pipeline.parsers.base import ParseResult


class PlaintextPdfParser:
    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict) -> ParseResult:
        text = file_bytes.decode("utf-8", errors="ignore")[:5000] or f"stub text from {filename}"
        page = {
            "page_no": 1,
            "blocks": [
                {"type": "text", "text": text, "bbox": None, "order": 1},
            ],
        }
        return ParseResult(raw_pages=[page], raw_blocks=page["blocks"], tables=[], figures=[])
```

### `src/rag_pipeline/parsers/pdf/vision_layout_parser.py`

```python
from __future__ import annotations

from rag_pipeline.parsers.base import ParseResult


class VisionLayoutParser:
    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict) -> ParseResult:
        # TODO: 接 OCR + layout engine
        page = {
            "page_no": 1,
            "blocks": [
                {"type": "title", "text": "文档标题", "bbox": [0.1, 0.1, 0.8, 0.15], "order": 1},
                {"type": "text", "text": "正文内容占位", "bbox": [0.1, 0.2, 0.9, 0.8], "order": 2},
            ],
        }
        return ParseResult(raw_pages=[page], raw_blocks=page["blocks"], tables=[], figures=[])
```

### `src/rag_pipeline/parsers/registry.py`

```python
from __future__ import annotations

from rag_pipeline.parsers.pdf.plaintext_pdf_parser import PlaintextPdfParser
from rag_pipeline.parsers.pdf.vision_layout_parser import VisionLayoutParser


PARSER_REGISTRY = {
    "plaintext": PlaintextPdfParser,
    "vision_layout": VisionLayoutParser,
}


def build_parser(engine: str):
    parser_cls = PARSER_REGISTRY[engine]
    return parser_cls()
```

## 8. 归一化与 chunking

### `src/rag_pipeline/normalization/block_normalizer.py`

```python
from __future__ import annotations

from rag_pipeline.utils.ids import new_id


def normalize_blocks(raw_pages: list[dict], parser_engine: str) -> list[dict]:
    blocks: list[dict] = []
    for page in raw_pages:
        for idx, raw in enumerate(page.get("blocks", [])):
            blocks.append(
                {
                    "block_id": new_id("blk"),
                    "page_no": page.get("page_no"),
                    "type": raw.get("type", "text"),
                    "text": raw.get("text", ""),
                    "bbox": raw.get("bbox"),
                    "reading_order": raw.get("order", idx + 1),
                    "section_path": [],
                    "confidence": raw.get("confidence", 0.95),
                    "source_engine": parser_engine,
                    "metadata": {},
                }
            )
    return blocks
```

### `src/rag_pipeline/chunking/base.py`

```python
from __future__ import annotations

from typing import Protocol


class ChunkBuilder(Protocol):
    def build(self, *, doc_id: str, filename: str, blocks: list[dict]) -> list[dict]: ...
```

### `src/rag_pipeline/chunking/general.py`

```python
from __future__ import annotations

from rag_pipeline.utils.ids import new_id


class GeneralChunkBuilder:
    def build(self, *, doc_id: str, filename: str, blocks: list[dict]) -> list[dict]:
        content = "\n".join(b["text"] for b in blocks if b.get("text"))
        return [
            {
                "chunk_id": new_id("chk"),
                "doc_id": doc_id,
                "chunk_type": "section",
                "title": filename,
                "content": content,
                "content_with_context": content,
                "page_span": sorted({b["page_no"] for b in blocks if b.get("page_no") is not None}),
                "section_path": [],
                "bbox_refs": [b["block_id"] for b in blocks],
                "table_refs": [],
                "image_refs": [],
                "source_engine": blocks[0]["source_engine"] if blocks else "",
                "metadata": {},
            }
        ]
```

### `src/rag_pipeline/chunking/manual.py`

```python
from __future__ import annotations

from rag_pipeline.chunking.general import GeneralChunkBuilder


class ManualChunkBuilder(GeneralChunkBuilder):
    pass
```

### `src/rag_pipeline/chunking/presentation.py`

```python
from __future__ import annotations

from rag_pipeline.utils.ids import new_id


class PresentationChunkBuilder:
    def build(self, *, doc_id: str, filename: str, blocks: list[dict]) -> list[dict]:
        by_page: dict[int, list[dict]] = {}
        for block in blocks:
            page_no = block.get("page_no") or 1
            by_page.setdefault(page_no, []).append(block)

        chunks: list[dict] = []
        for page_no, page_blocks in by_page.items():
            content = "\n".join(b["text"] for b in page_blocks if b.get("text"))
            chunks.append(
                {
                    "chunk_id": new_id("chk"),
                    "doc_id": doc_id,
                    "chunk_type": "slide",
                    "title": f"{filename} - slide {page_no}",
                    "content": content,
                    "content_with_context": content,
                    "page_span": [page_no],
                    "section_path": [str(page_no)],
                    "bbox_refs": [b["block_id"] for b in page_blocks],
                    "table_refs": [],
                    "image_refs": [],
                    "source_engine": page_blocks[0]["source_engine"],
                    "metadata": {},
                }
            )
        return chunks
```

### `src/rag_pipeline/chunking/registry.py`

```python
from __future__ import annotations

from rag_pipeline.chunking.general import GeneralChunkBuilder
from rag_pipeline.chunking.manual import ManualChunkBuilder
from rag_pipeline.chunking.presentation import PresentationChunkBuilder


CHUNKER_REGISTRY = {
    "general": GeneralChunkBuilder,
    "paper": GeneralChunkBuilder,
    "manual": ManualChunkBuilder,
    "presentation": PresentationChunkBuilder,
    "qa": GeneralChunkBuilder,
    "table": GeneralChunkBuilder,
    "laws": GeneralChunkBuilder,
}


def build_chunker(strategy: str):
    return CHUNKER_REGISTRY[strategy]()
```

## 9. 增强模块

### `src/rag_pipeline/enhancement/llm_client.py`

```python
from __future__ import annotations


class LLMClient:
    def complete_structured(self, *, prompt_name: str, payload: dict) -> dict:
        # TODO: 接具体模型
        return {"prompt_name": prompt_name, "payload": payload}
```

### `src/rag_pipeline/enhancement/classify.py`

```python
from __future__ import annotations


def classify_chunks(chunks: list[dict]) -> list[dict]:
    classified = []
    for chunk in chunks:
        new_chunk = dict(chunk)
        new_chunk["category"] = "Manual"
        new_chunk["usage_tag"] = "qa_candidate"
        classified.append(new_chunk)
    return classified
```

### `src/rag_pipeline/enhancement/entities.py`

```python
from __future__ import annotations

from rag_pipeline.utils.ids import new_id


def extract_entities(chunks: list[dict]) -> list[dict]:
    entities: list[dict] = []
    for chunk in chunks:
        if chunk.get("title"):
            entities.append(
                {
                    "entity_id": new_id("ent"),
                    "text": chunk["title"],
                    "type": "SECTION",
                    "canonical_name": chunk["title"],
                    "aliases": [],
                    "confidence": 0.7,
                    "metadata": {"chunk_id": chunk["chunk_id"]},
                }
            )
    return entities
```

### `src/rag_pipeline/enhancement/keywords.py`

```python
from __future__ import annotations


def extract_keywords(chunks: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for chunk in chunks:
        words = [w for w in chunk.get("content", "").split()[:10] if w]
        rows.append({"chunk_id": chunk["chunk_id"], "keywords": words[:5]})
    return rows
```

### `src/rag_pipeline/enhancement/summary.py`

```python
from __future__ import annotations


def summarize_chunks(chunks: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for chunk in chunks:
        content = chunk.get("content", "")
        rows.append({"chunk_id": chunk["chunk_id"], "summary": content[:200]})
    return rows
```

### `src/rag_pipeline/enhancement/qa_generation.py`

```python
from __future__ import annotations

from rag_pipeline.utils.ids import new_id


def generate_qa_pairs(chunks: list[dict]) -> list[dict]:
    qa_pairs: list[dict] = []
    for chunk in chunks:
        if chunk.get("usage_tag") != "qa_candidate":
            continue
        qa_pairs.append(
            {
                "qa_id": new_id("qa"),
                "chunk_id": chunk["chunk_id"],
                "question": f"{chunk.get('title', '该文档')}讲了什么？",
                "answer": chunk.get("content", "")[:300],
                "answer_span": None,
                "question_type": "summary",
                "difficulty": "easy",
            }
        )
    return qa_pairs
```

### `src/rag_pipeline/enhancement/question_generalization.py`

```python
from __future__ import annotations


def generalize_questions(qa_pairs: list[dict]) -> list[dict]:
    variants: list[dict] = []
    for qa in qa_pairs:
        variants.extend(
            [
                {"qa_id": qa["qa_id"], "question": qa["question"]},
                {"qa_id": qa["qa_id"], "question": qa["question"].replace("什么", "哪些内容")},
            ]
        )
    return variants
```

## 10. embedding 与索引

### `src/rag_pipeline/embeddings/title_content_fusion.py`

```python
from __future__ import annotations


def build_embedding_text(chunk: dict) -> str:
    title = chunk.get("title", "")
    section_path = " > ".join(chunk.get("section_path", []))
    content = chunk.get("content", "")
    return f"Title: {title}\nSection: {section_path}\n\n{content}".strip()
```

### `src/rag_pipeline/embeddings/embedder.py`

```python
from __future__ import annotations


def embed_texts(rows: list[dict]) -> list[dict]:
    embeddings: list[dict] = []
    for row in rows:
        text = row["embedding_text"]
        fake_vec = [float(len(text) % 10), 0.1, 0.2]
        embeddings.append(
            {
                "chunk_id": row["chunk_id"],
                "embedding": fake_vec,
                "embedding_model": "stub-embedder",
                "embedding_version": "v1",
            }
        )
    return embeddings
```

### `src/rag_pipeline/indexing/upsert_manager.py`

```python
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
        self.doc_store.upsert_document(doc)
        self.doc_store.upsert_blocks(doc["doc_id"], blocks)
        self.doc_store.upsert_chunks(doc["doc_id"], chunks)

    def upsert_enhance_outputs(
        self,
        *,
        doc_id: str,
        chunks: list[dict],
        embeddings: list[dict],
        entities: list[dict],
        relations: list[dict] | None = None,
    ) -> None:
        self.doc_store.upsert_chunks(doc_id, chunks)
        self.vector_store.upsert_embeddings(doc_id, embeddings)
        self.graph_store.upsert_entities(doc_id, entities)
        self.graph_store.upsert_relations(doc_id, relations or [])
```

## 11. 图节点

### `src/rag_pipeline/graphs/nodes/ingest.py`

```python
from __future__ import annotations

from rag_pipeline.utils.file_io import read_bytes
from rag_pipeline.utils.hashing import sha256_bytes


def ingest_document(state: dict) -> dict:
    file_bytes = read_bytes(state["source_uri"])
    return {
        "file_bytes": file_bytes,
        "raw_metadata": {
            "sha256": sha256_bytes(file_bytes),
            "filename": state["filename"],
        },
    }
```

### `src/rag_pipeline/graphs/nodes/inspect.py`

```python
from __future__ import annotations

from rag_pipeline.parsers.file_inspector import inspect_file


def inspect(state: dict) -> dict:
    return {"file_meta": inspect_file(state["filename"], state["file_bytes"])}
```

### `src/rag_pipeline/graphs/nodes/select_strategy.py`

```python
from __future__ import annotations

from rag_pipeline.parsers.router import select_strategy


def select_strategy_node(state: dict) -> dict:
    doc_strategy, parser_engine = select_strategy(
        state["file_meta"],
        state.get("parser_preferences", {}),
    )
    return {"doc_strategy": doc_strategy, "parser_engine": parser_engine}
```

### `src/rag_pipeline/graphs/nodes/parse_pdf.py`

```python
from __future__ import annotations

from rag_pipeline.parsers.registry import build_parser


def parse_pdf(state: dict) -> dict:
    parser = build_parser(state["parser_engine"])
    result = parser.parse(
        file_bytes=state["file_bytes"],
        filename=state["filename"],
        metadata=state["file_meta"],
    )
    return {
        "raw_pages": result.raw_pages,
        "raw_blocks": result.raw_blocks,
        "tables": result.tables,
        "figures": result.figures,
    }
```

### `src/rag_pipeline/graphs/nodes/normalize_blocks.py`

```python
from __future__ import annotations

from rag_pipeline.normalization.block_normalizer import normalize_blocks


def normalize_blocks_node(state: dict) -> dict:
    return {
        "normalized_blocks": normalize_blocks(
            state["raw_pages"],
            parser_engine=state["parser_engine"],
        )
    }
```

### `src/rag_pipeline/graphs/nodes/quality_gate.py`

```python
from __future__ import annotations


def parse_quality_gate(state: dict) -> dict:
    blocks = state.get("normalized_blocks", [])
    score = 0.95 if blocks else 0.1
    return {
        "parse_quality_score": score,
        "requires_review": score < 0.7,
    }


def enhance_quality_gate(state: dict) -> dict:
    has_embeddings = bool(state.get("embeddings"))
    score = 0.95 if has_embeddings else 0.3
    return {
        "enhance_quality_score": score,
        "requires_review": score < 0.7,
    }
```

### `src/rag_pipeline/graphs/nodes/build_chunks.py`

```python
from __future__ import annotations

from rag_pipeline.chunking.registry import build_chunker


def build_chunks_node(state: dict) -> dict:
    chunker = build_chunker(state["doc_strategy"])
    chunks = chunker.build(
        doc_id=state["doc_id"],
        filename=state["filename"],
        blocks=state["normalized_blocks"],
    )
    return {"chunks": chunks}
```

### `src/rag_pipeline/graphs/nodes/classify_chunks.py`

```python
from __future__ import annotations

from rag_pipeline.enhancement.classify import classify_chunks


def classify_chunks_node(state: dict) -> dict:
    classified = classify_chunks(state["chunks"])
    return {"chunks": classified, "classified_chunks": classified}
```

### `src/rag_pipeline/graphs/nodes/extract_entities.py`

```python
from __future__ import annotations

from rag_pipeline.enhancement.entities import extract_entities


def extract_entities_node(state: dict) -> dict:
    return {"entities": extract_entities(state["chunks"])}
```

### `src/rag_pipeline/graphs/nodes/extract_keywords.py`

```python
from __future__ import annotations

from rag_pipeline.enhancement.keywords import extract_keywords


def extract_keywords_node(state: dict) -> dict:
    return {"keywords": extract_keywords(state["chunks"])}
```

### `src/rag_pipeline/graphs/nodes/summarize_chunks.py`

```python
from __future__ import annotations

from rag_pipeline.enhancement.summary import summarize_chunks


def summarize_chunks_node(state: dict) -> dict:
    return {"summaries": summarize_chunks(state["chunks"])}
```

### `src/rag_pipeline/graphs/nodes/generate_qa.py`

```python
from __future__ import annotations

from rag_pipeline.enhancement.qa_generation import generate_qa_pairs


def generate_qa_node(state: dict) -> dict:
    return {"qa_pairs": generate_qa_pairs(state["chunks"])}
```

### `src/rag_pipeline/graphs/nodes/generalize_questions.py`

```python
from __future__ import annotations

from rag_pipeline.enhancement.question_generalization import generalize_questions


def generalize_questions_node(state: dict) -> dict:
    return {"question_variants": generalize_questions(state.get("qa_pairs", []))}
```

### `src/rag_pipeline/graphs/nodes/embed_chunks.py`

```python
from __future__ import annotations

from rag_pipeline.embeddings.embedder import embed_texts
from rag_pipeline.embeddings.title_content_fusion import build_embedding_text


def embed_chunks_node(state: dict) -> dict:
    rows = [
        {
            "chunk_id": chunk["chunk_id"],
            "embedding_text": build_embedding_text(chunk),
        }
        for chunk in state["chunks"]
    ]
    return {"embeddings": embed_texts(rows)}
```

### `src/rag_pipeline/graphs/nodes/write_doc_store.py`

```python
from __future__ import annotations


def write_doc_store_node(state: dict, *, upsert_manager) -> dict:
    upsert_manager.upsert_parse_outputs(
        doc={
            "doc_id": state["doc_id"],
            "filename": state["filename"],
            "source_uri": state["source_uri"],
            "metadata": state.get("raw_metadata", {}),
        },
        blocks=state["normalized_blocks"],
        chunks=state["chunks"],
    )
    return {}
```

### `src/rag_pipeline/graphs/nodes/write_vector_store.py`

```python
from __future__ import annotations


def write_vector_store_node(state: dict, *, upsert_manager) -> dict:
    upsert_manager.upsert_enhance_outputs(
        doc_id=state["doc_id"],
        chunks=state["chunks"],
        embeddings=state["embeddings"],
        entities=state.get("entities", []),
        relations=[],
    )
    return {}
```

### `src/rag_pipeline/graphs/nodes/finalize.py`

```python
from __future__ import annotations


def finalize_node(state: dict) -> dict:
    return state
```

## 12. 路由器

### `src/rag_pipeline/graphs/routers/parse_routes.py`

```python
from __future__ import annotations


def route_by_file_type(state: dict) -> str:
    ext = state["file_meta"]["ext"]
    if ext == ".pdf":
        return "parse_pdf"
    if ext in {".docx", ".doc"}:
        return "parse_docx"
    if ext in {".pptx", ".ppt"}:
        return "parse_slides"
    if ext in {".xlsx", ".xls", ".csv"}:
        return "parse_spreadsheet"
    return "parse_pdf"


def route_after_parse_quality(state: dict) -> str:
    return "build_chunks" if not state.get("requires_review") else "finalize"
```

### `src/rag_pipeline/graphs/routers/enhance_routes.py`

```python
from __future__ import annotations


def route_for_qa(state: dict) -> str:
    candidate = any(chunk.get("usage_tag") == "qa_candidate" for chunk in state.get("chunks", []))
    return "generate_qa" if candidate else "embed_chunks"


def route_after_qa(state: dict) -> str:
    return "generalize_questions"
```

## 13. ParseGraph

### `src/rag_pipeline/graphs/parse_graph.py`

```python
from __future__ import annotations

from functools import partial

from langgraph.graph import END, START, StateGraph

from rag_pipeline.schemas.state import ParseState
from rag_pipeline.storage.checkpoints import build_checkpointer
from rag_pipeline.graphs.nodes.ingest import ingest_document
from rag_pipeline.graphs.nodes.inspect import inspect
from rag_pipeline.graphs.nodes.select_strategy import select_strategy_node
from rag_pipeline.graphs.nodes.parse_pdf import parse_pdf
from rag_pipeline.graphs.nodes.normalize_blocks import normalize_blocks_node
from rag_pipeline.graphs.nodes.quality_gate import parse_quality_gate
from rag_pipeline.graphs.nodes.build_chunks import build_chunks_node
from rag_pipeline.graphs.nodes.write_doc_store import write_doc_store_node
from rag_pipeline.graphs.nodes.finalize import finalize_node
from rag_pipeline.graphs.routers.parse_routes import route_after_parse_quality, route_by_file_type


def build_parse_graph(*, upsert_manager):
    builder = StateGraph(ParseState)

    builder.add_node("ingest_document", ingest_document)
    builder.add_node("inspect", inspect)
    builder.add_node("select_strategy", select_strategy_node)
    builder.add_node("parse_pdf", parse_pdf)
    builder.add_node("parse_docx", parse_pdf)
    builder.add_node("parse_spreadsheet", parse_pdf)
    builder.add_node("parse_slides", parse_pdf)
    builder.add_node("normalize_blocks", normalize_blocks_node)
    builder.add_node("parse_quality_gate", parse_quality_gate)
    builder.add_node("build_chunks", build_chunks_node)
    builder.add_node("write_doc_store", partial(write_doc_store_node, upsert_manager=upsert_manager))
    builder.add_node("finalize", finalize_node)

    builder.add_edge(START, "ingest_document")
    builder.add_edge("ingest_document", "inspect")
    builder.add_edge("inspect", "select_strategy")

    builder.add_conditional_edges(
        "select_strategy",
        route_by_file_type,
        {
            "parse_pdf": "parse_pdf",
            "parse_docx": "parse_docx",
            "parse_spreadsheet": "parse_spreadsheet",
            "parse_slides": "parse_slides",
        },
    )

    builder.add_edge("parse_pdf", "normalize_blocks")
    builder.add_edge("parse_docx", "normalize_blocks")
    builder.add_edge("parse_spreadsheet", "normalize_blocks")
    builder.add_edge("parse_slides", "normalize_blocks")
    builder.add_edge("normalize_blocks", "parse_quality_gate")

    builder.add_conditional_edges(
        "parse_quality_gate",
        route_after_parse_quality,
        {
            "build_chunks": "build_chunks",
            "finalize": "finalize",
        },
    )

    builder.add_edge("build_chunks", "write_doc_store")
    builder.add_edge("write_doc_store", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile(checkpointer=build_checkpointer())
```

## 14. EnhanceIndexGraph

### `src/rag_pipeline/graphs/enhance_index_graph.py`

```python
from __future__ import annotations

from functools import partial

from langgraph.graph import END, START, StateGraph

from rag_pipeline.schemas.state import EnhanceState
from rag_pipeline.storage.checkpoints import build_checkpointer
from rag_pipeline.graphs.nodes.classify_chunks import classify_chunks_node
from rag_pipeline.graphs.nodes.extract_entities import extract_entities_node
from rag_pipeline.graphs.nodes.extract_keywords import extract_keywords_node
from rag_pipeline.graphs.nodes.summarize_chunks import summarize_chunks_node
from rag_pipeline.graphs.nodes.generate_qa import generate_qa_node
from rag_pipeline.graphs.nodes.generalize_questions import generalize_questions_node
from rag_pipeline.graphs.nodes.embed_chunks import embed_chunks_node
from rag_pipeline.graphs.nodes.quality_gate import enhance_quality_gate
from rag_pipeline.graphs.nodes.write_vector_store import write_vector_store_node
from rag_pipeline.graphs.nodes.finalize import finalize_node
from rag_pipeline.graphs.routers.enhance_routes import route_for_qa


def build_enhance_index_graph(*, upsert_manager):
    builder = StateGraph(EnhanceState)

    builder.add_node("classify_chunks", classify_chunks_node)
    builder.add_node("extract_entities", extract_entities_node)
    builder.add_node("extract_keywords", extract_keywords_node)
    builder.add_node("summarize_chunks", summarize_chunks_node)
    builder.add_node("generate_qa", generate_qa_node)
    builder.add_node("generalize_questions", generalize_questions_node)
    builder.add_node("embed_chunks", embed_chunks_node)
    builder.add_node("enhance_quality_gate", enhance_quality_gate)
    builder.add_node("write_vector_store", partial(write_vector_store_node, upsert_manager=upsert_manager))
    builder.add_node("finalize", finalize_node)

    builder.add_edge(START, "classify_chunks")
    builder.add_edge("classify_chunks", "extract_entities")
    builder.add_edge("extract_entities", "extract_keywords")
    builder.add_edge("extract_keywords", "summarize_chunks")

    builder.add_conditional_edges(
        "summarize_chunks",
        route_for_qa,
        {
            "generate_qa": "generate_qa",
            "embed_chunks": "embed_chunks",
        },
    )

    builder.add_edge("generate_qa", "generalize_questions")
    builder.add_edge("generalize_questions", "embed_chunks")
    builder.add_edge("embed_chunks", "enhance_quality_gate")
    builder.add_edge("enhance_quality_gate", "write_vector_store")
    builder.add_edge("write_vector_store", "finalize")
    builder.add_edge("finalize", END)

    return builder.compile(checkpointer=build_checkpointer())
```

## 15. 服务层

### `src/rag_pipeline/services/pipeline_service.py`

```python
from __future__ import annotations

from rag_pipeline.graphs.enhance_index_graph import build_enhance_index_graph
from rag_pipeline.graphs.parse_graph import build_parse_graph
from rag_pipeline.indexing.upsert_manager import UpsertManager
from rag_pipeline.storage.doc_store import InMemoryDocStore
from rag_pipeline.storage.graph_store import InMemoryGraphStore
from rag_pipeline.storage.vector_store import InMemoryVectorStore


class PipelineService:
    def __init__(self) -> None:
        self.doc_store = InMemoryDocStore()
        self.vector_store = InMemoryVectorStore()
        self.graph_store = InMemoryGraphStore()
        self.upsert_manager = UpsertManager(
            doc_store=self.doc_store,
            vector_store=self.vector_store,
            graph_store=self.graph_store,
        )
        self.parse_graph = build_parse_graph(upsert_manager=self.upsert_manager)
        self.enhance_graph = build_enhance_index_graph(upsert_manager=self.upsert_manager)

    def run_parse(self, payload: dict) -> dict:
        return self.parse_graph.invoke(payload)

    def run_enhance(self, doc_id: str) -> dict:
        chunks = self.doc_store.load_chunks(doc_id)
        return self.enhance_graph.invoke({"doc_id": doc_id, "chunks": chunks})

    def run_end_to_end(self, payload: dict) -> dict:
        parse_result = self.run_parse(payload)
        enhance_result = self.run_enhance(payload["doc_id"])
        return {"parse": parse_result, "enhance": enhance_result}
```

## 16. 脚本入口

### `scripts/run_parse.py`

```python
from __future__ import annotations

import argparse

from rag_pipeline.services.pipeline_service import PipelineService


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--doc-id", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--filename", required=True)
    args = parser.parse_args()

    svc = PipelineService()
    result = svc.run_parse(
        {
            "doc_id": args.doc_id,
            "source_uri": args.source,
            "filename": args.filename,
            "content_type": "application/octet-stream",
            "parser_preferences": {},
        }
    )
    print(result)


if __name__ == "__main__":
    main()
```

### `scripts/run_enhance.py`

```python
from __future__ import annotations

import argparse

from rag_pipeline.services.pipeline_service import PipelineService


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--doc-id", required=True)
    args = parser.parse_args()

    svc = PipelineService()
    result = svc.run_enhance(args.doc_id)
    print(result)


if __name__ == "__main__":
    main()
```

### `scripts/run_end_to_end.py`

```python
from __future__ import annotations

import argparse

from rag_pipeline.services.pipeline_service import PipelineService


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--doc-id", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--filename", required=True)
    args = parser.parse_args()

    svc = PipelineService()
    result = svc.run_end_to_end(
        {
            "doc_id": args.doc_id,
            "source_uri": args.source,
            "filename": args.filename,
            "content_type": "application/octet-stream",
            "parser_preferences": {},
        }
    )
    print(result)


if __name__ == "__main__":
    main()
```

## 17. API 入口

### `src/rag_pipeline/api/app.py`

```python
from __future__ import annotations

from fastapi import FastAPI

from rag_pipeline.api.routes.health import router as health_router
from rag_pipeline.api.routes.parse import router as parse_router
from rag_pipeline.api.routes.enhance import router as enhance_router


app = FastAPI(title="rag-pipeline")
app.include_router(health_router)
app.include_router(parse_router)
app.include_router(enhance_router)
```

### `src/rag_pipeline/api/routes/health.py`

```python
from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    return {"ok": True}
```

### `src/rag_pipeline/api/routes/parse.py`

```python
from __future__ import annotations

from fastapi import APIRouter

from rag_pipeline.services.pipeline_service import PipelineService

router = APIRouter(prefix="/parse", tags=["parse"])
svc = PipelineService()


@router.post("")
def run_parse(payload: dict) -> dict:
    return svc.run_parse(payload)
```

### `src/rag_pipeline/api/routes/enhance.py`

```python
from __future__ import annotations

from fastapi import APIRouter

from rag_pipeline.services.pipeline_service import PipelineService

router = APIRouter(prefix="/enhance", tags=["enhance"])
svc = PipelineService()


@router.post("/{doc_id}")
def run_enhance(doc_id: str) -> dict:
    return svc.run_enhance(doc_id)
```

## 18. README 起步指令

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
python scripts/run_end_to_end.py --doc-id demo_001 --source ./sample.txt --filename sample.txt
uvicorn rag_pipeline.api.app:app --reload
```

## 19. 给 Codex 的实现优先级

1. 先跑通 `PlaintextPdfParser -> normalize_blocks -> GeneralChunkBuilder -> InMemory stores`
2. 再补 `docx_native / pptx_native / sheet_native`
3. 再接真实 OCR/layout parser 到 `VisionLayoutParser`
4. 再把 `InMemory*Store` 换成 SQLite/Postgres/Chroma/PGVector
5. 最后把 enhancement 模块替换成真实 LLM structured output

## 20. 后续最该优先替换的占位点

- `VisionLayoutParser.parse()`
- `LLMClient.complete_structured()`
- `embed_texts()`
- `DocStore / VectorStore / GraphStore` 的真实实现
- `route_by_file_type()` 与 `select_strategy()` 的细粒度规则

