from __future__ import annotations

import asyncio
import hashlib
import importlib.util
import json
import mimetypes
import os
import re
import sqlite3
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def load_module(module_path: Path, module_name: str) -> Any | None:
    if not module_path.exists():
        return None
    spec = importlib.util.spec_from_file_location(module_name, str(module_path))
    if spec is None or spec.loader is None:
        return None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BASE_DIR = Path(__file__).resolve().parents[1]
UPLOAD_DIR = BASE_DIR / "uploads"
PARSED_DIR = BASE_DIR / "parsed-data"
DATA_DIR = BASE_DIR / "data"
SQLITE_PATH = DATA_DIR / "app.db"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PARSED_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

PARSER_MODULE = load_module(BASE_DIR / "backend" / "python-parser" / "parser.py", "ai_doctor_parser")
ANNOTATOR_MODULE = load_module(BASE_DIR / "backend" / "nlp-annotator" / "annotator.py", "ai_doctor_annotator")
RAG_PIPELINE_SRC = BASE_DIR / "backend" / "rag_pipeline" / "src"
if RAG_PIPELINE_SRC.exists() and str(RAG_PIPELINE_SRC) not in sys.path:
    sys.path.insert(0, str(RAG_PIPELINE_SRC))

try:
    from rag_pipeline.services.pipeline_service import PipelineService
except Exception:
    PipelineService = None

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".md", ".txt"}
RAG_ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".csv"}
MAX_FILE_SIZE = 100 * 1024 * 1024
FILE_NAME_LEN_LIMIT = 255
MAX_FILES_PER_UPLOAD = 32
DEFAULT_CHUNK_SIZE = 1200
DEFAULT_CHUNK_OVERLAP = 180

db = sqlite3.connect(SQLITE_PATH, check_same_thread=False)
db.row_factory = sqlite3.Row
db.execute(
    """
    CREATE TABLE IF NOT EXISTS kb_nodes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      node_type TEXT NOT NULL CHECK (node_type IN ('kb', 'folder')),
      parent_id TEXT,
      knowledge_base_type TEXT,
      document_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
    """
)
db.commit()


def seed_kb_nodes() -> None:
    row = db.execute("SELECT COUNT(*) AS count FROM kb_nodes").fetchone()
    count = int(row["count"]) if row is not None else 0
    if count > 0:
        return

    now = now_iso()
    seed_nodes = [
        ("kb-1", "个人库", "kb", None, "personal"),
        ("folder-1", "工作文档", "folder", "kb-1", None),
        ("folder-2", "学习资料", "folder", "kb-1", None),
        ("kb-2", "单位库", "kb", None, "department"),
        ("folder-3", "项目文档", "folder", "kb-2", None),
        ("folder-4", "会议纪要", "folder", "kb-2", None),
        ("folder-5", "技术文档", "folder", "kb-2", None),
        ("kb-3", "公共库", "kb", None, "public"),
        ("folder-6", "政策法规", "folder", "kb-3", None),
        ("folder-7", "标准规范", "folder", "kb-3", None),
        ("folder-8", "行业报告", "folder", "kb-3", None),
    ]
    db.executemany(
        """
        INSERT INTO kb_nodes (
          id, name, node_type, parent_id, knowledge_base_type, document_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        """,
        [(node_id, name, node_type, parent_id, kb_type, now, now) for node_id, name, node_type, parent_id, kb_type in seed_nodes],
    )
    db.commit()


seed_kb_nodes()

app = FastAPI(title="AI Doctor Unified Python Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tasks: dict[str, dict[str, Any]] = {}
documents: dict[str, dict[str, Any]] = {}
rag_results: dict[str, dict[str, Any]] = {}
rag_pipeline_service = PipelineService() if PipelineService is not None else None


class KBNodeCreatePayload(BaseModel):
    name: str
    nodeType: str
    parentId: str | None = None
    knowledgeBaseType: str | None = None


class AnnotatePayload(BaseModel):
    content: str
    documentName: str | None = None


class RagParsePayload(BaseModel):
    docId: str
    sourceUri: str
    filename: str
    contentType: str | None = None
    parserPreferences: dict[str, Any] | None = None


class RagEnhancePayload(BaseModel):
    docId: str


def ensure_rag_pipeline_service() -> Any:
    if rag_pipeline_service is None:
        raise HTTPException(status_code=503, detail="rag_pipeline is unavailable")
    return rag_pipeline_service


def guess_content_type(filename: str) -> str:
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or "application/octet-stream"


def parse_parser_preferences(value: str | None) -> dict[str, Any]:
    if value is None or value.strip() == "":
        return {}
    try:
        payload = json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid parserPreferences JSON: {exc}") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="parserPreferences must be a JSON object")
    return payload


async def save_rag_upload(file: UploadFile) -> tuple[str, Path]:
    filename = normalize_filename(file.filename or "")
    if filename == "":
        raise HTTPException(status_code=400, detail="No file selected")
    ext = Path(filename).suffix.lower()
    if ext not in RAG_ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported rag file type: {ext}")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large")

    date_dir = UPLOAD_DIR / "rag-pipeline" / datetime.utcnow().strftime("%Y-%m-%d")
    date_dir.mkdir(parents=True, exist_ok=True)
    save_path = date_dir / f"{uuid4()}-{filename}"
    save_path.write_bytes(content)
    return filename, save_path


def build_rag_payload(
    *,
    doc_id: str,
    source_uri: str,
    filename: str,
    content_type: str | None,
    parser_preferences: dict[str, Any] | None,
) -> dict[str, Any]:
    return {
        "doc_id": doc_id,
        "source_uri": source_uri,
        "filename": filename,
        "content_type": content_type or guess_content_type(filename),
        "parser_preferences": parser_preferences or {},
    }


def upsert_rag_document_and_task(
    *,
    doc_id: str,
    filename: str,
    save_path: Path,
    file_size: int,
    parse_result: dict[str, Any] | None = None,
    enhance_result: dict[str, Any] | None = None,
    status: str = "completed",
    progress: int = 100,
    current_stage: str = "Stored",
    error: str | None = None,
) -> dict[str, Any]:
    """Upsert document/task records so existing frontend pages can display rag uploads."""
    now = now_iso()
    ext = Path(filename).suffix.lower()
    task_id = f"rag-{doc_id}"
    doc_status = "parsed" if status == "completed" else ("failed" if status == "failed" else "parsing")
    documents[doc_id] = {
        "id": doc_id,
        "name": filename,
        "type": ext.replace(".", ""),
        "size": file_size,
        "path": str(save_path),
        "content": "",
        "metadata": {"pipeline": "rag"},
        "knowledgeBaseId": "kb-1",
        "folderId": None,
        "category": "RAG Upload",
        "status": doc_status,
        "createdAt": documents.get(doc_id, {}).get("createdAt", now),
        "updatedAt": now,
        "parsedAt": now if status == "completed" else None,
        "chunks": len(parse_result.get("chunks", [])) if isinstance(parse_result, dict) else 0,
        "vectors": len(enhance_result.get("embeddings", [])) if isinstance(enhance_result, dict) else 0,
    }

    task = {
        "id": task_id,
        "documentId": doc_id,
        "documentName": filename,
        "status": status,
        "progress": progress,
        "currentStage": current_stage,
        "error": error,
        "knowledgeBaseId": "kb-1",
        "folderId": None,
        "category": "RAG Upload",
        "size": file_size,
        "createdAt": tasks.get(task_id, {}).get("createdAt", now),
        "startedAt": now if status in {"parsing", "completed", "failed"} else None,
        "completedAt": now if status in {"completed", "failed"} else None,
        "logs": [
            {
                "time": now,
                "stage": "rag",
                "status": status,
                "progress": progress,
                "message": f"RAG end-to-end {status}.",
            }
        ],
    }
    tasks[task_id] = task
    return task


async def run_rag_end_to_end_job(
    *,
    doc_id: str,
    rag_payload: dict[str, Any],
    save_path: Path,
    filename: str,
) -> None:
    """Run RAG end-to-end in background and keep state/task observability updated."""
    service = ensure_rag_pipeline_service()
    slot = rag_results.setdefault(doc_id, {})
    slot["status"] = "parsing"
    slot["progress"] = 25
    slot["currentStage"] = "Parsing"
    slot["updatedAt"] = now_iso()
    slot.pop("errors", None)
    slot.pop("parse", None)
    slot.pop("enhance", None)

    upsert_rag_document_and_task(
        doc_id=doc_id,
        filename=filename,
        save_path=save_path,
        file_size=save_path.stat().st_size,
        parse_result=None,
        enhance_result=None,
        status="parsing",
        progress=25,
        current_stage="Parsing",
        error=None,
    )

    try:
        result = await asyncio.to_thread(service.run_end_to_end, rag_payload)
        slot["parse"] = result.get("parse", {})
        slot["enhance"] = result.get("enhance", {})
        slot["status"] = "completed"
        slot["progress"] = 100
        slot["currentStage"] = "Stored"
        slot["updatedAt"] = now_iso()
        upsert_rag_document_and_task(
            doc_id=doc_id,
            filename=filename,
            save_path=save_path,
            file_size=save_path.stat().st_size,
            parse_result=result.get("parse", {}),
            enhance_result=result.get("enhance", {}),
            status="completed",
            progress=100,
            current_stage="Stored",
            error=None,
        )
    except Exception as exc:
        slot["errors"] = [f"rag end-to-end failed: {exc}"]
        slot["status"] = "failed"
        slot["progress"] = 100
        slot["currentStage"] = "Failed"
        slot["updatedAt"] = now_iso()
        upsert_rag_document_and_task(
            doc_id=doc_id,
            filename=filename,
            save_path=save_path,
            file_size=save_path.stat().st_size,
            parse_result=None,
            enhance_result=None,
            status="failed",
            progress=100,
            current_stage="Failed",
            error=str(exc),
        )


def build_rag_state_item(doc_id: str, slot: dict[str, Any]) -> dict[str, Any]:
    parse_payload = slot.get("parse") if isinstance(slot.get("parse"), dict) else {}
    enhance_payload = slot.get("enhance") if isinstance(slot.get("enhance"), dict) else {}
    parse_score = parse_payload.get("parse_quality_score")
    enhance_score = enhance_payload.get("enhance_quality_score")
    parse_requires_review = bool(parse_payload.get("requires_review", False))
    enhance_requires_review = bool(enhance_payload.get("requires_review", False))

    slot_status = slot.get("status")
    slot_progress = slot.get("progress")
    slot_current_stage = slot.get("currentStage")
    status = str(slot_status) if isinstance(slot_status, str) else "completed"
    progress = int(slot_progress) if isinstance(slot_progress, int) else 100
    current_stage = str(slot_current_stage) if isinstance(slot_current_stage, str) else "Stored"
    errors: list[str] = []
    if isinstance(parse_payload.get("errors"), list):
        errors.extend(str(item) for item in parse_payload.get("errors"))
    if isinstance(enhance_payload.get("errors"), list):
        errors.extend(str(item) for item in enhance_payload.get("errors"))
    if isinstance(slot.get("errors"), list):
        errors.extend(str(item) for item in slot.get("errors"))
    if errors:
        status = "failed"
        current_stage = "Failed"
        progress = 100
    elif parse_requires_review or enhance_requires_review:
        status = "parsing"
        current_stage = "Review"
        progress = 80

    parse_chunks = parse_payload.get("chunks") if isinstance(parse_payload.get("chunks"), list) else []
    embeddings = enhance_payload.get("embeddings") if isinstance(enhance_payload.get("embeddings"), list) else []

    return {
        "docId": doc_id,
        "sourceUri": slot.get("sourceUri"),
        "filename": slot.get("filename"),
        "updatedAt": slot.get("updatedAt"),
        "status": status,
        "progress": progress,
        "currentStage": current_stage,
        "error": "; ".join(errors) if errors else None,
        "parseScore": parse_score,
        "enhanceScore": enhance_score,
        "parseChunks": len(parse_chunks),
        "vectorCount": len(embeddings),
        "qaCount": len(enhance_payload.get("qa_pairs", [])) if isinstance(enhance_payload.get("qa_pairs"), list) else 0,
    }


def build_kb_tree() -> list[dict[str, Any]]:
    rows = db.execute("SELECT * FROM kb_nodes ORDER BY created_at ASC").fetchall()
    all_rows = [dict(row) for row in rows]
    children_map: dict[str | None, list[dict[str, Any]]] = defaultdict(list)
    for row in all_rows:
        children_map[row["parent_id"]].append(row)

    def build_node(row: dict[str, Any]) -> dict[str, Any]:
        node: dict[str, Any] = {
            "id": row["id"],
            "name": row["name"],
            "type": row["node_type"],
            "documentCount": row["document_count"],
        }
        if row["parent_id"] is not None:
            node["parentId"] = row["parent_id"]
        if row["node_type"] == "kb":
            node["knowledgeBaseType"] = row["knowledge_base_type"]

        raw_children = children_map.get(row["id"], [])
        if raw_children:
            node["children"] = [build_node(child) for child in raw_children]
        else:
            node["children"] = []
        return node

    roots = [row for row in all_rows if row["node_type"] == "kb" and row["parent_id"] is None]
    return [build_node(root) for root in roots]


def delete_kb_node_recursively(node_id: str) -> None:
    children = db.execute("SELECT id FROM kb_nodes WHERE parent_id = ?", (node_id,)).fetchall()
    for child in children:
        delete_kb_node_recursively(str(child["id"]))
    db.execute("DELETE FROM kb_nodes WHERE id = ?", (node_id,))


def get_kb_node(node_id: str) -> dict[str, Any] | None:
    row = db.execute("SELECT * FROM kb_nodes WHERE id = ?", (node_id,)).fetchone()
    if row is None:
        return None
    return dict(row)


def resolve_upload_target(target_node_id: str | None) -> tuple[str, str | None, str]:
    default_kb_id = "kb-1"
    default_category = "上传文档"
    if target_node_id is None:
        return default_kb_id, None, default_category

    target_node = get_kb_node(target_node_id)
    if target_node is None:
        return default_kb_id, None, default_category

    if target_node["node_type"] == "kb":
        return str(target_node["id"]), None, default_category

    folder_id = str(target_node["id"])
    category = str(target_node["name"])
    cursor = target_node
    while cursor is not None and cursor["node_type"] != "kb":
        parent_id = cursor["parent_id"]
        if parent_id is None:
            break
        cursor = get_kb_node(str(parent_id))

    if cursor is None or cursor["node_type"] != "kb":
        return default_kb_id, folder_id, category
    return str(cursor["id"]), folder_id, category


def normalize_filename(filename: str) -> str:
    return Path(filename).name.strip()


def utf8_len(value: str) -> int:
    return len(value.encode("utf-8"))


def find_duplicate_name(name: str, knowledge_base_id: str, folder_id: str | None) -> bool:
    for doc in documents.values():
        if (
            doc.get("knowledgeBaseId") == knowledge_base_id
            and doc.get("folderId") == folder_id
            and str(doc.get("name", "")).lower() == name.lower()
        ):
            return True
    return False


def duplicate_name(name: str, knowledge_base_id: str, folder_id: str | None) -> str:
    if not find_duplicate_name(name, knowledge_base_id, folder_id):
        return name

    stem = Path(name).stem
    suffix = Path(name).suffix
    seq = 1
    while True:
        candidate = f"{stem}({seq}){suffix}"
        if not find_duplicate_name(candidate, knowledge_base_id, folder_id):
            return candidate
        seq += 1


def chunk_text(content: str, chunk_size: int = DEFAULT_CHUNK_SIZE, overlap: int = DEFAULT_CHUNK_OVERLAP) -> list[dict[str, Any]]:
    normalized = content.strip()
    if normalized == "":
        return []
    if len(normalized) <= chunk_size:
        return [{"text": normalized, "metadata": {"chunk_index": 1, "start_char": 0, "end_char": len(normalized), "char_count": len(normalized)}}]

    overlap = max(0, min(overlap, max(0, chunk_size - 1)))
    sentence_units = [segment.strip() for segment in re.split(r"(?<=[。！？.!?；;\n])", normalized) if segment.strip()]
    if not sentence_units:
        sentence_units = [normalized]

    chunk_texts: list[str] = []
    current = ""
    for sentence in sentence_units:
        candidate = sentence if current == "" else current + sentence
        if len(candidate) <= chunk_size:
            current = candidate
            continue

        if current:
            chunk_texts.append(current)
            carry = current[-overlap:] if overlap > 0 else ""
            current = carry + sentence
        else:
            # Extremely long sentence fallback
            start = 0
            while start < len(sentence):
                end = min(len(sentence), start + chunk_size)
                chunk_texts.append(sentence[start:end])
                if end >= len(sentence):
                    break
                start = max(0, end - overlap)
            current = ""

    if current:
        chunk_texts.append(current)

    chunks: list[dict[str, Any]] = []
    search_start = 0
    for idx, text in enumerate(chunk_texts, start=1):
        if text.strip() == "":
            continue
        pos = normalized.find(text, search_start)
        if pos < 0:
            pos = max(0, search_start)
        end_pos = min(len(normalized), pos + len(text))
        chunks.append(
            {
                "text": text,
                "metadata": {
                    "chunk_index": idx,
                    "start_char": pos,
                    "end_char": end_pos,
                    "char_count": len(text),
                },
            }
        )
        search_start = max(search_start, end_pos - overlap)

    return chunks


def fake_embedding(text: str, dim: int = 16) -> list[float]:
    seed = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
    values: list[float] = []
    for idx in range(dim):
        byte_value = seed[idx % len(seed)]
        values.append(round((byte_value / 255.0) * 2 - 1, 6))
    return values


def append_task_log(task: dict[str, Any], stage: str, status: str, progress: int, message: str) -> None:
    logs = task.setdefault("logs", [])
    logs.append(
        {
            "time": now_iso(),
            "stage": stage,
            "status": status,
            "progress": progress,
            "message": message,
        }
    )


def parse_file(file_path: Path, ext: str) -> dict[str, Any]:
    if PARSER_MODULE is None:
        return {
            "content": f"[mock parse] file at {file_path}",
            "chunks": [{"text": "mock chunk 1", "metadata": {"page": 1}}],
            "metadata": {"mock": True},
        }

    ext = ext.lower()
    if ext == ".pdf":
        return PARSER_MODULE.parse_pdf(str(file_path))
    if ext in {".doc", ".docx"}:
        return PARSER_MODULE.parse_docx(str(file_path))
    if ext in {".txt", ".md"}:
        return PARSER_MODULE.parse_text_file(str(file_path))

    raise ValueError(f"Unsupported file extension: {ext}")


def mock_annotation(content: str) -> dict[str, Any]:
    entities: list[dict[str, Any]] = []
    keywords: list[dict[str, Any]] = []

    time_regex = re.compile(r"\d{4}-\d{2}-\d{2}|\d{4}年\d{1,2}月\d{1,2}日")
    number_regex = re.compile(r"\d+(?:\.\d+)?(?:%|万|亿|元)?")
    org_regex = re.compile(r"[\u4e00-\u9fa5]{2,20}(?:公司|集团|局|部|委|院|校|中心|政府)")

    for match in time_regex.finditer(content):
        entities.append({"type": "time", "value": match.group(), "confidence": 0.85, "location": "time"})
    for match in number_regex.finditer(content):
        if len(match.group()) > 1:
            entities.append({"type": "number", "value": match.group(), "confidence": 0.7, "location": "number"})
    for match in org_regex.finditer(content):
        entities.append({"type": "organization", "value": match.group(), "confidence": 0.8, "location": "organization"})

    words = [w for w in re.split(r"[\s,，。！？；：()\n]+", content) if len(w) > 1]
    word_freq: dict[str, int] = defaultdict(int)
    for word in words:
        word_freq[word] += 1
    for word, freq in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]:
        keywords.append({"keyword": word, "confidence": min(0.95, 0.5 + freq / max(1, len(words))), "score": float(freq)})

    category = "其他"
    if "政策" in content or "条例" in content:
        category = "政策文件"
    elif "技术" in content or "架构" in content:
        category = "技术方案"
    elif "合同" in content or "协议" in content:
        category = "合同"

    return {
        "success": True,
        "entities": entities[:20],
        "keywords": keywords,
        "categories": [{"category": category, "confidence": 0.7, "keywords": []}],
    }


def run_annotation(content: str, document_name: str | None) -> dict[str, Any]:
    if ANNOTATOR_MODULE is None:
        return mock_annotation(content)

    try:
        entity_extractor = ANNOTATOR_MODULE.get_entity_extractor()
        entities_raw = entity_extractor.extract(content)
        entity_type_count: dict[str, int] = defaultdict(int)
        entities: list[dict[str, Any]] = []
        for entity in entities_raw:
            entity_type = str(entity.get("type", ""))
            entity_type_count[entity_type] += 1
            if entity_type_count[entity_type] > 10:
                continue
            entities.append(
                {
                    "type": entity_type,
                    "value": str(entity.get("value", "")),
                    "confidence": float(entity.get("confidence", 0.5)),
                    "location": entity_type,
                }
            )

        keyword_extractor = ANNOTATOR_MODULE.get_keyword_extractor()
        keywords: list[dict[str, Any]] = []
        if keyword_extractor is not None:
            keywords_raw = keyword_extractor.extract(content, top_k=15)
            for keyword in keywords_raw[:10]:
                keywords.append(
                    {
                        "keyword": str(keyword.get("keyword", "")),
                        "confidence": float(keyword.get("confidence", 0.5)),
                    }
                )

        classifier = ANNOTATOR_MODULE.get_classifier()
        categories_raw = classifier.classify(content)
        categories: list[dict[str, Any]] = []
        for category in categories_raw:
            categories.append(
                {
                    "category": str(category.get("category", "其他")),
                    "confidence": float(category.get("confidence", 0.5)),
                    "keywords": category.get("keywords", []),
                }
            )

        return {
            "success": True,
            "entities": entities,
            "keywords": keywords,
            "categories": categories,
            "documentName": document_name,
        }
    except Exception:
        return mock_annotation(content)


async def process_document(task_id: str, document_id: str, file_path: Path, ext: str) -> None:
    task = tasks.get(task_id)
    document = documents.get(document_id)
    if task is None or document is None:
        return

    try:
        task["status"] = "parsing"
        task["progress"] = 25
        task["currentStage"] = "Parsing"
        task["startedAt"] = now_iso()
        append_task_log(task, "parsing", "running", 25, "Document parsing started.")
        document["status"] = "parsing"
        document["updatedAt"] = now_iso()

        parse_result = await asyncio.to_thread(parse_file, file_path, ext)
        content = str(parse_result.get("content", "") or "")
        parsed_chunks_raw = parse_result.get("chunks", [])
        parser_metadata = parse_result.get("metadata", {})
        if not isinstance(parser_metadata, dict):
            parser_metadata = {}

        task["status"] = "chunking"
        task["progress"] = 50
        task["currentStage"] = "Chunking"
        append_task_log(task, "chunking", "running", 50, "Chunking started.")

        normalized_chunks: list[dict[str, Any]] = []
        if isinstance(parsed_chunks_raw, list):
            for chunk in parsed_chunks_raw:
                if isinstance(chunk, dict):
                    text = str(chunk.get("text", ""))
                    metadata = chunk.get("metadata", {})
                    if not isinstance(metadata, dict):
                        metadata = {}
                else:
                    text = str(chunk)
                    metadata = {}
                if text.strip():
                    normalized_chunks.append({"text": text, "metadata": metadata})
        # Some parser outputs only one giant chunk (common in Chinese docs). Re-chunk to keep retrieval quality.
        need_rechunk = (
            len(normalized_chunks) == 0
            or (len(normalized_chunks) <= 1 and len(content) > DEFAULT_CHUNK_SIZE)
            or any(len(str(chunk.get("text", ""))) > DEFAULT_CHUNK_SIZE * 1.5 for chunk in normalized_chunks)
        )
        if need_rechunk and content.strip():
            normalized_chunks = chunk_text(content)

        task["status"] = "vectorizing"
        task["progress"] = 75
        task["currentStage"] = "Vectorizing"
        append_task_log(task, "vectorizing", "running", 75, "Vectorization started.")

        vectors = [fake_embedding(chunk["text"]) for chunk in normalized_chunks]
        await asyncio.sleep(0.02)

        task["status"] = "store"
        task["progress"] = 90
        task["currentStage"] = "Store"
        append_task_log(task, "store", "running", 90, "Persisting parsed artifacts.")

        task["status"] = "completed"
        task["progress"] = 100
        task["currentStage"] = "Stored"
        task["completedAt"] = now_iso()
        append_task_log(task, "store", "completed", 100, "Document processing completed.")
        document["status"] = "parsed"
        document["parsedAt"] = task["completedAt"]
        document["updatedAt"] = task["completedAt"]
        document["content"] = content
        document["chunks"] = len(normalized_chunks)
        document["vectors"] = len(vectors)
        document["metadata"] = parser_metadata

        parsed_file_path = PARSED_DIR / f"{document_id}.json"
        parsed_file_path.write_text(
            json.dumps(
                {
                    "content": content,
                    "chunks": normalized_chunks,
                    "vectors": vectors,
                    "metadata": parser_metadata,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        # Run rag_pipeline end-to-end in-process and cache result for frontend retrieval.
        if rag_pipeline_service is not None:
            rag_payload = build_rag_payload(
                doc_id=document_id,
                source_uri=str(file_path),
                filename=document.get("name", file_path.name),
                content_type=guess_content_type(str(document.get("name", file_path.name))),
                parser_preferences={},
            )
            try:
                rag_result = await asyncio.to_thread(rag_pipeline_service.run_end_to_end, rag_payload)
                slot = rag_results.setdefault(document_id, {})
                slot["sourceUri"] = str(file_path)
                slot["filename"] = document.get("name", file_path.name)
                slot["parse"] = rag_result.get("parse")
                slot["enhance"] = rag_result.get("enhance")
                slot["updatedAt"] = now_iso()
            except Exception as rag_exc:
                slot = rag_results.setdefault(document_id, {})
                slot["errors"] = [f"auto rag end-to-end failed: {rag_exc}"]
                slot["updatedAt"] = now_iso()
    except Exception as exc:
        task["status"] = "failed"
        task["progress"] = 0
        task["currentStage"] = "Failed"
        task["error"] = str(exc)
        append_task_log(task, "failed", "failed", 0, str(exc))
        document["status"] = "failed"
        document["updatedAt"] = now_iso()


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "timestamp": now_iso()}


@app.get("/api/tasks")
async def get_tasks() -> dict[str, Any]:
    return {"tasks": list(tasks.values())}


@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str) -> dict[str, Any]:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task": task}


@app.get("/api/documents")
async def get_documents() -> dict[str, Any]:
    return {"documents": list(documents.values())}


@app.get("/api/documents/{document_id}/parsed")
async def get_document_parsed(document_id: str) -> dict[str, Any]:
    document = documents.get(document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    parsed_file_path = PARSED_DIR / f"{document_id}.json"
    if not parsed_file_path.exists():
        return {
            "documentId": document_id,
            "available": False,
            "chunks": [],
            "vectors": [],
            "metadata": document.get("metadata", {}),
        }

    try:
        parsed_data = json.loads(parsed_file_path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read parsed data: {exc}") from exc

    normalized_chunks: list[dict[str, Any]] = []
    raw_chunks = parsed_data.get("chunks", [])
    if isinstance(raw_chunks, list):
        for idx, chunk in enumerate(raw_chunks):
            if isinstance(chunk, dict):
                text = str(chunk.get("text", ""))
                metadata = chunk.get("metadata", {})
                if not isinstance(metadata, dict):
                    metadata = {}
            else:
                text = str(chunk)
                metadata = {}
            normalized_chunks.append(
                {
                    "index": idx + 1,
                    "text": text,
                    "metadata": metadata,
                }
            )

    metadata = parsed_data.get("metadata", {})
    if not isinstance(metadata, dict):
        metadata = {}

    return {
        "documentId": document_id,
        "available": True,
        "chunks": normalized_chunks,
        "vectors": parsed_data.get("vectors", []),
        "metadata": metadata,
    }


@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str) -> dict[str, Any]:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    document = documents.get(task["documentId"])
    if document is not None:
        file_path = Path(document["path"])
        if file_path.exists():
            try:
                os.remove(file_path)
            except OSError:
                pass
        del documents[task["documentId"]]

    del tasks[task_id]
    return {"message": "Task deleted"}


@app.post("/api/tasks/{task_id}/retry")
async def retry_task(task_id: str) -> dict[str, Any]:
    task = tasks.get(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    document = documents.get(task["documentId"])
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    task["status"] = "pending"
    task["progress"] = 0
    task["currentStage"] = "Pending"
    task["error"] = None
    task["startedAt"] = None
    task["completedAt"] = None
    task["logs"] = []
    append_task_log(task, "retry", "running", 0, "Task restarted.")
    document["status"] = "pending"
    document["updatedAt"] = now_iso()

    ext = "." + document["type"]
    asyncio.create_task(process_document(task_id, task["documentId"], Path(document["path"]), ext))
    return {"message": "Task restarted", "task": task}


@app.get("/api/queue/status")
async def queue_status() -> dict[str, int]:
    all_tasks = list(tasks.values())
    return {
        "pending": len([t for t in all_tasks if t["status"] == "pending"]),
        "processing": len([t for t in all_tasks if t["status"] in {"uploading", "parsing", "chunking", "vectorizing", "store"}]),
        "completed": len([t for t in all_tasks if t["status"] == "completed"]),
        "failed": len([t for t in all_tasks if t["status"] == "failed"]),
    }


@app.get("/api/kb/tree")
async def get_kb_tree() -> dict[str, Any]:
    return {"knowledgeBases": build_kb_tree()}


@app.post("/api/kb/nodes")
async def create_kb_node(payload: KBNodeCreatePayload) -> dict[str, Any]:
    name = payload.name.strip()
    node_type = payload.nodeType
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if node_type not in {"kb", "folder"}:
        raise HTTPException(status_code=400, detail="nodeType must be kb or folder")

    if node_type == "folder":
        if not payload.parentId:
            raise HTTPException(status_code=400, detail="Folder requires parentId")
        parent = db.execute("SELECT * FROM kb_nodes WHERE id = ?", (payload.parentId,)).fetchone()
        if parent is None or parent["node_type"] not in {"kb", "folder"}:
            raise HTTPException(status_code=400, detail="Folder parent must be a kb or folder node")

    now = now_iso()
    node_id = f"{node_type}-{uuid4()}"
    db.execute(
        """
        INSERT INTO kb_nodes (
          id, name, node_type, parent_id, knowledge_base_type, document_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        """,
        (
            node_id,
            name,
            node_type,
            payload.parentId if node_type == "folder" else None,
            payload.knowledgeBaseType if node_type == "kb" else None,
            now,
            now,
        ),
    )
    db.commit()
    return {"id": node_id, "knowledgeBases": build_kb_tree()}


@app.delete("/api/kb/nodes/{node_id}")
async def delete_kb_node(node_id: str) -> dict[str, Any]:
    row = db.execute("SELECT id FROM kb_nodes WHERE id = ?", (node_id,)).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Node not found")
    delete_kb_node_recursively(node_id)
    db.commit()
    return {"message": "Deleted", "knowledgeBases": build_kb_tree()}


@app.post("/api/upload")
async def upload_files(
    files: list[UploadFile] = File(...),
    targetNodeId: str | None = Form(default=None),
    targetNodeType: str | None = Form(default=None),
) -> dict[str, Any]:
    if len(files) == 0:
        raise HTTPException(status_code=400, detail="No files uploaded")
    if len(files) > MAX_FILES_PER_UPLOAD:
        raise HTTPException(status_code=400, detail=f"Too many files. Maximum {MAX_FILES_PER_UPLOAD} files per upload.")

    if targetNodeType is not None and targetNodeType not in {"kb", "folder"}:
        raise HTTPException(status_code=400, detail="targetNodeType must be kb or folder")

    knowledge_base_id, folder_id, category = resolve_upload_target(targetNodeId)
    kb_node = get_kb_node(knowledge_base_id)
    if kb_node is None or kb_node.get("node_type") != "kb":
        raise HTTPException(status_code=400, detail=f"Knowledge base not found: {knowledge_base_id}")

    for file in files:
        filename = normalize_filename(file.filename or "")
        if filename == "":
            raise HTTPException(status_code=400, detail="No file selected.")
        if utf8_len(filename) > FILE_NAME_LEN_LIMIT:
            raise HTTPException(
                status_code=400,
                detail=f"File name must be {FILE_NAME_LEN_LIMIT} bytes or less: {filename}",
            )
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    uploaded_tasks: list[dict[str, Any]] = []
    errors: list[str] = []
    for file in files:
        filename = normalize_filename(file.filename or "")
        ext = Path(filename).suffix.lower()
        filename = duplicate_name(filename, knowledge_base_id, folder_id)

        try:
            content = await file.read()
        except Exception as exc:
            errors.append(f"{filename}: read failed ({exc})")
            continue
        if len(content) == 0:
            errors.append(f"{filename}: empty file")
            continue
        if len(content) > MAX_FILE_SIZE:
            errors.append(f"{filename}: file too large")
            continue

        date_dir = UPLOAD_DIR / datetime.utcnow().strftime("%Y-%m-%d")
        date_dir.mkdir(parents=True, exist_ok=True)

        unique_name = f"{uuid4()}-{filename}"
        save_path = date_dir / unique_name
        save_path.write_bytes(content)

        document_id = str(uuid4())
        task_id = str(uuid4())

        task = {
            "id": task_id,
            "documentId": document_id,
            "documentName": filename,
            "status": "uploading",
            "progress": 10,
            "currentStage": "Upload",
            "knowledgeBaseId": knowledge_base_id,
            "folderId": folder_id,
            "category": category,
            "size": len(content),
            "createdAt": now_iso(),
        }
        append_task_log(task, "upload", "completed", 10, "Upload accepted.")
        document = {
            "id": document_id,
            "name": filename,
            "type": ext.replace(".", ""),
            "size": len(content),
            "path": str(save_path),
            "content": "",
            "metadata": {},
            "knowledgeBaseId": knowledge_base_id,
            "folderId": folder_id,
            "category": category,
            "status": "pending",
            "createdAt": now_iso(),
            "updatedAt": now_iso(),
            "chunks": 0,
            "vectors": 0,
        }

        tasks[task_id] = task
        documents[document_id] = document
        uploaded_tasks.append(task)
        asyncio.create_task(process_document(task_id, document_id, save_path, ext))

    if not uploaded_tasks and errors:
        raise HTTPException(status_code=400, detail="; ".join(errors))

    return {
        "message": f"Uploaded {len(uploaded_tasks)} file(s)",
        "tasks": uploaded_tasks,
        "errors": errors,
    }


@app.post("/api/annotate")
async def annotate(payload: AnnotatePayload) -> dict[str, Any]:
    if payload.content.strip() == "":
        raise HTTPException(status_code=400, detail="Missing content")
    return run_annotation(payload.content, payload.documentName)


@app.post("/api/rag/parse")
async def rag_parse(payload: RagParsePayload) -> dict[str, Any]:
    service = ensure_rag_pipeline_service()
    rag_payload = build_rag_payload(
        doc_id=payload.docId,
        source_uri=payload.sourceUri,
        filename=payload.filename,
        content_type=payload.contentType,
        parser_preferences=payload.parserPreferences,
    )
    try:
        parse_result = service.run_parse(rag_payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"rag parse failed: {exc}") from exc

    slot = rag_results.setdefault(payload.docId, {})
    slot["parse"] = parse_result
    slot["updatedAt"] = now_iso()
    return {"success": True, "docId": payload.docId, "parse": parse_result}


@app.post("/api/rag/parse-file")
async def rag_parse_file(
    file: UploadFile = File(...),
    docId: str | None = Form(default=None),
    parserPreferences: str | None = Form(default=None),
) -> dict[str, Any]:
    service = ensure_rag_pipeline_service()
    filename, save_path = await save_rag_upload(file)
    parsed_preferences = parse_parser_preferences(parserPreferences)
    rag_doc_id = docId or str(uuid4())
    rag_payload = build_rag_payload(
        doc_id=rag_doc_id,
        source_uri=str(save_path),
        filename=filename,
        content_type=guess_content_type(filename),
        parser_preferences=parsed_preferences,
    )
    try:
        parse_result = service.run_parse(rag_payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"rag parse-file failed: {exc}") from exc

    slot = rag_results.setdefault(rag_doc_id, {})
    slot["sourceUri"] = str(save_path)
    slot["filename"] = filename
    slot["parse"] = parse_result
    slot["updatedAt"] = now_iso()
    upsert_rag_document_and_task(
        doc_id=rag_doc_id,
        filename=filename,
        save_path=save_path,
        file_size=save_path.stat().st_size,
        parse_result=parse_result,
        enhance_result=None,
    )
    return {
        "success": True,
        "docId": rag_doc_id,
        "sourceUri": str(save_path),
        "filename": filename,
        "parse": parse_result,
    }


@app.post("/api/rag/enhance")
async def rag_enhance(payload: RagEnhancePayload) -> dict[str, Any]:
    service = ensure_rag_pipeline_service()
    try:
        enhance_result = service.run_enhance(payload.docId)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"rag enhance failed: {exc}") from exc

    slot = rag_results.setdefault(payload.docId, {})
    slot["enhance"] = enhance_result
    slot["updatedAt"] = now_iso()
    return {"success": True, "docId": payload.docId, "enhance": enhance_result}


@app.post("/api/rag/end-to-end")
async def rag_end_to_end(payload: RagParsePayload) -> dict[str, Any]:
    service = ensure_rag_pipeline_service()
    rag_payload = build_rag_payload(
        doc_id=payload.docId,
        source_uri=payload.sourceUri,
        filename=payload.filename,
        content_type=payload.contentType,
        parser_preferences=payload.parserPreferences,
    )
    try:
        result = service.run_end_to_end(rag_payload)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"rag end-to-end failed: {exc}") from exc

    slot = rag_results.setdefault(payload.docId, {})
    slot["parse"] = result.get("parse", {})
    slot["enhance"] = result.get("enhance", {})
    slot["updatedAt"] = now_iso()
    return {"success": True, "docId": payload.docId, "result": result}


@app.post("/api/rag/end-to-end-file")
async def rag_end_to_end_file(
    file: UploadFile = File(...),
    docId: str | None = Form(default=None),
    parserPreferences: str | None = Form(default=None),
) -> dict[str, Any]:
    ensure_rag_pipeline_service()
    filename, save_path = await save_rag_upload(file)
    parsed_preferences = parse_parser_preferences(parserPreferences)
    rag_doc_id = docId or str(uuid4())
    rag_payload = build_rag_payload(
        doc_id=rag_doc_id,
        source_uri=str(save_path),
        filename=filename,
        content_type=guess_content_type(filename),
        parser_preferences=parsed_preferences,
    )
    slot = rag_results.setdefault(rag_doc_id, {})
    slot["sourceUri"] = str(save_path)
    slot["filename"] = filename
    slot["status"] = "parsing"
    slot["progress"] = 10
    slot["currentStage"] = "Queued"
    slot["updatedAt"] = now_iso()
    task = upsert_rag_document_and_task(
        doc_id=rag_doc_id,
        filename=filename,
        save_path=save_path,
        file_size=save_path.stat().st_size,
        parse_result=None,
        enhance_result=None,
        status="parsing",
        progress=10,
        current_stage="Queued",
        error=None,
    )
    asyncio.create_task(
        run_rag_end_to_end_job(
            doc_id=rag_doc_id,
            rag_payload=rag_payload,
            save_path=save_path,
            filename=filename,
        )
    )
    return {
        "success": True,
        "docId": rag_doc_id,
        "sourceUri": str(save_path),
        "filename": filename,
        "task": task,
        "accepted": True,
        "state": build_rag_state_item(rag_doc_id, slot),
    }


@app.get("/api/rag/results/{doc_id}")
async def rag_results_by_doc(doc_id: str) -> dict[str, Any]:
    service = ensure_rag_pipeline_service()
    slot = rag_results.get(doc_id, {})
    return {
        "docId": doc_id,
        "parse": slot.get("parse"),
        "enhance": slot.get("enhance"),
        "updatedAt": slot.get("updatedAt"),
        "sourceUri": slot.get("sourceUri"),
        "filename": slot.get("filename"),
        "stores": {
            "chunks": service.doc_store.load_chunks(doc_id),
            "vectors": service.vector_store.rows.get(doc_id, []),
            "entities": service.graph_store.entities.get(doc_id, []),
            "relations": service.graph_store.relations.get(doc_id, []),
        },
    }


@app.get("/api/rag/results")
async def rag_results_all() -> dict[str, Any]:
    return {"results": rag_results}


@app.get("/api/rag/state")
async def rag_state_all() -> dict[str, Any]:
    items = [build_rag_state_item(doc_id, slot) for doc_id, slot in rag_results.items()]
    return {"items": items}


@app.get("/api/rag/state/{doc_id}")
async def rag_state_by_doc(doc_id: str) -> dict[str, Any]:
    slot = rag_results.get(doc_id)
    if slot is None:
        raise HTTPException(status_code=404, detail="RAG state not found")
    return {"item": build_rag_state_item(doc_id, slot)}


@app.post("/api/rag/retry/{doc_id}")
async def rag_retry(doc_id: str) -> dict[str, Any]:
    ensure_rag_pipeline_service()
    slot = rag_results.get(doc_id)
    if slot is None:
        raise HTTPException(status_code=404, detail="RAG state not found")
    source_uri = slot.get("sourceUri")
    filename = slot.get("filename")
    if not source_uri or not filename:
        raise HTTPException(status_code=400, detail="RAG source is missing for this doc")

    rag_payload = build_rag_payload(
        doc_id=doc_id,
        source_uri=str(source_uri),
        filename=str(filename),
        content_type=guess_content_type(str(filename)),
        parser_preferences={},
    )
    slot["status"] = "parsing"
    slot["progress"] = 10
    slot["currentStage"] = "Queued"
    slot.pop("errors", None)
    slot["updatedAt"] = now_iso()
    save_path = Path(str(source_uri))
    if not save_path.exists():
        raise HTTPException(status_code=404, detail="RAG source file does not exist")
    upsert_rag_document_and_task(
        doc_id=doc_id,
        filename=str(filename),
        save_path=save_path,
        file_size=save_path.stat().st_size,
        parse_result=None,
        enhance_result=None,
        status="parsing",
        progress=10,
        current_stage="Queued",
        error=None,
    )
    asyncio.create_task(
        run_rag_end_to_end_job(
            doc_id=doc_id,
            rag_payload=rag_payload,
            save_path=save_path,
            filename=str(filename),
        )
    )
    return {"success": True, "docId": doc_id, "accepted": True, "state": build_rag_state_item(doc_id, slot)}
