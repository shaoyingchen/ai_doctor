from __future__ import annotations

import asyncio
import importlib.util
import json
import mimetypes
import os
import re
import sqlite3
import sys
import threading
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# 加载 backend/.env（LLM_*/EMBEDDING_*/CORS 等配置），须在服务初始化前执行
try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent / ".env")
except ImportError:
    pass

# Import vector service
try:
    from services.vector_service import QdrantVectorStore
except ImportError:
    QdrantVectorStore = None

# Import search service
try:
    from services.search_service import SearchService
except ImportError:
    SearchService = None

# Import enhance service
try:
    from services.enhance_service import EnhanceService
except ImportError:
    EnhanceService = None

# Import annotation service
try:
    from services.annotation_service import AnnotationService
except ImportError:
    AnnotationService = None

# Import chat service & LLM client（Step 2：RAG 问答）
try:
    from services.chat_service import ChatService
    from services.llm_client import get_llm_client
except ImportError:
    ChatService = None
    get_llm_client = None


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

# RAG 人工审核质量阈值：parse_quality_score 低于该值时流水线在 enhance 节点前
# 中断（写 pipeline_checkpoints，状态 waiting_review），等待人工 approve/reject。
# 可用环境变量 RAG_REVIEW_QUALITY_THRESHOLD 覆盖（如设为 1.0 可强制所有文档进审核）。
try:
    RAG_REVIEW_QUALITY_THRESHOLD = float(os.getenv("RAG_REVIEW_QUALITY_THRESHOLD", "0.6"))
except (TypeError, ValueError):
    RAG_REVIEW_QUALITY_THRESHOLD = 0.6

# ---------------------------------------------------------------------------
# Thread-safe SQLite access layer (B2)
#
# Previously a single sqlite3.Connection created with check_same_thread=False
# was shared by all FastAPI worker threads without any lock, which risks
# "Recursive use of cursors" errors and silent transaction interleaving under
# concurrent requests.
#
# The layer below provides:
# - threading.local(): one connection per thread (SQLite connections must not
#   be used concurrently across threads)
# - a global threading.RLock: serializes every execute/executemany/commit so
#   statements never interleave mid-transaction
# - get_db()/db_execute(): helpers for code that needs the raw connection or
#   a one-shot execution
# ---------------------------------------------------------------------------

_db_lock = threading.RLock()
_db_local = threading.local()


def get_db() -> sqlite3.Connection:
    """Return the SQLite connection bound to the current thread.

    Connections are created lazily per thread and reused. row_factory is
    always sqlite3.Row so rows support dict-like access. WAL mode and a busy
    timeout are enabled so concurrent readers/writers on separate per-thread
    connections degrade gracefully instead of raising "database is locked".
    """
    conn = getattr(_db_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(SQLITE_PATH, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=10000")
        _db_local.conn = conn
    return conn


class _FetchedCursor:
    """Eagerly-fetched cursor proxy.

    sqlite3 cursors are only safe to consume while the connection lock is
    held. This proxy prefetches all rows inside the lock so callers can read
    results after the lock has been released, keeping the public behaviour of
    ``db.execute(...)`` unchanged (fetchone/fetchall/iteration, plus
    rowcount/lastrowid attributes).
    """

    def __init__(self, rows: list[Any], rowcount: int, lastrowid: Any) -> None:
        self._rows = list(rows)
        self._index = 0
        self.rowcount = rowcount
        self.lastrowid = lastrowid

    def fetchone(self) -> Any | None:
        if self._index >= len(self._rows):
            return None
        row = self._rows[self._index]
        self._index += 1
        return row

    def fetchall(self) -> list[Any]:
        remaining = self._rows[self._index:]
        self._index = len(self._rows)
        return list(remaining)

    def __iter__(self) -> "_FetchedCursor":
        return self

    def __next__(self) -> Any:
        row = self.fetchone()
        if row is None:
            raise StopIteration
        return row


class ThreadSafeDB:
    """Thread-safe database executor exposed as the module-level ``db``.

    Implements the subset of the sqlite3.Connection API used across this
    project (execute/executemany/commit/rollback, row_factory attribute).
    Every operation resolves the calling thread's own connection via
    threading.local() and runs under the global RLock, so concurrent FastAPI
    requests can no longer corrupt shared cursor/transaction state.
    """

    def __init__(self) -> None:
        self._row_factory: Any = sqlite3.Row

    @property
    def row_factory(self) -> Any:
        return self._row_factory

    @row_factory.setter
    def row_factory(self, value: Any) -> None:
        self._row_factory = value
        # Best effort: apply to the current thread's connection if it exists.
        # get_db() always creates new connections with sqlite3.Row.
        conn = getattr(_db_local, "conn", None)
        if conn is not None:
            conn.row_factory = value

    def execute(self, sql: str, parameters: Any = ()) -> _FetchedCursor:
        with _db_lock:
            cursor = get_db().execute(sql, tuple(parameters))
            return _FetchedCursor(cursor.fetchall(), cursor.rowcount, cursor.lastrowid)

    def executemany(self, sql: str, seq_of_parameters: Any) -> _FetchedCursor:
        with _db_lock:
            cursor = get_db().executemany(sql, seq_of_parameters)
            return _FetchedCursor(cursor.fetchall(), cursor.rowcount, cursor.lastrowid)

    def commit(self) -> None:
        with _db_lock:
            get_db().commit()

    def rollback(self) -> None:
        with _db_lock:
            get_db().rollback()


db = ThreadSafeDB()


def db_execute(sql: str, parameters: Any = ()) -> _FetchedCursor:
    """One-shot helper: execute SQL on the current thread's connection under the global lock."""
    return db.execute(sql, parameters)


def init_db() -> None:
    """Create tables and indexes using the thread-safe executor (same mechanism as runtime access)."""
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
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          knowledge_base_id TEXT NOT NULL,
          folder_id TEXT,
          content_type TEXT,
          size INTEGER,
          status TEXT CHECK (status IN ('pending', 'parsing', 'completed', 'failed')),
          progress INTEGER DEFAULT 0,
          error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (knowledge_base_id) REFERENCES kb_nodes(id)
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS chunks (
          id TEXT PRIMARY KEY,
          doc_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          text TEXT NOT NULL,
          metadata TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS pipeline_checkpoints (
          doc_id TEXT PRIMARY KEY,
          task_id TEXT,
          payload_json TEXT,
          parse_result_json TEXT,
          paused_at_node TEXT,
          review_reason TEXT,
          status TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
        """
    )
    db.execute("CREATE INDEX IF NOT EXISTS idx_documents_kb ON documents(knowledge_base_id)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_checkpoints_status ON pipeline_checkpoints(status)")
    db.commit()


init_db()


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

# B7: allow_origins=["*"] is invalid together with allow_credentials=True
# (browsers reject such responses). Read the allowed origins from the
# CORS_ALLOW_ORIGINS env var (comma-separated), defaulting to the local
# frontend dev servers.
cors_allow_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tasks: dict[str, dict[str, Any]] = {}
documents: dict[str, dict[str, Any]] = {}
rag_results: dict[str, dict[str, Any]] = {}
rag_pipeline_service = PipelineService() if PipelineService is not None else None

# Initialize vector service
vector_service = None
if QdrantVectorStore is not None:
    try:
        # vector_size 默认跟随 EMBEDDING_DIM；维度不一致时 collection 自动重建
        vector_service = QdrantVectorStore(
            collection_name="knowledge_base",
            storage_path=str(DATA_DIR / "qdrant"),
        )
    except Exception as e:
        print(f"Warning: Failed to initialize vector service: {e}")
        vector_service = None

# Initialize search service
search_service = None
if SearchService is not None:
    try:
        search_service = SearchService(db=db, vector_service=vector_service)
    except Exception as e:
        print(f"Warning: Failed to initialize search service: {e}")
        search_service = None

# Initialize chat service（Step 2：RAG 问答，依赖 search_service）
chat_service = None
if ChatService is not None and search_service is not None:
    try:
        chat_service = ChatService(search_service=search_service)
    except Exception as e:
        print(f"Warning: Failed to initialize chat service: {e}")
        chat_service = None

# Initialize enhance service
enhance_service = None
if EnhanceService is not None:
    try:
        enhance_service = EnhanceService(db=db)
    except Exception as e:
        print(f"Warning: Failed to initialize enhance service: {e}")
        enhance_service = None

# Initialize annotation service
annotation_service = None
if AnnotationService is not None:
    try:
        annotation_service = AnnotationService(db=db)
    except Exception as e:
        print(f"Warning: Failed to initialize annotation service: {e}")
        annotation_service = None

# 启动时输出 LLM 配置状态（未配置时给出降级提示，embedding 状态由 vector_service 初始化时输出）
if get_llm_client is not None:
    try:
        get_llm_client()
    except Exception as e:
        print(f"Warning: Failed to check LLM client status: {e}")


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


class SearchPayload(BaseModel):
    query: str
    mode: str = "hybrid"
    kbIds: list[str] | None = None
    limit: int = 20


class ChatPayload(BaseModel):
    message: str
    history: list[dict[str, Any]] = []
    mode: Literal["qa", "create", "analyze"] = "qa"
    kbIds: list[str] = []
    stream: bool = True


class RagReviewActionPayload(BaseModel):
    action: Literal["approve", "reject"]
    notes: str | None = None


class GenerateQAPayload(BaseModel):
    docId: str
    chunkIds: list[str] | None = None
    count: int = 3
    # 前端会附带 {model, granularity, maxQAPerDoc, autoApprove} 等生成配置；
    # 当前仅声明接收保证契约完整，具体策略由 enhance_service 统一控制
    config: dict[str, Any] | None = None


class GeneralizeQuestionPayload(BaseModel):
    question: str
    count: int = 5


class CreateAnnotationTaskPayload(BaseModel):
    docId: str


class AutoAnnotatePayload(BaseModel):
    docId: str


class SaveAnnotationPayload(BaseModel):
    taskId: str
    annotations: dict[str, Any]


class ApproveTaskPayload(BaseModel):
    reviewer: str | None = None


class RejectTaskPayload(BaseModel):
    reviewer: str | None = None
    reason: str | None = None


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
    knowledge_base_id: str = "kb-1",
    folder_id: str | None = None,
) -> dict[str, Any]:
    """Upsert document/task records so existing frontend pages can display rag uploads."""
    now = now_iso()
    ext = Path(filename).suffix.lower()
    task_id = f"rag-{doc_id}"
    # 内存 documents dict 原样透出 waiting_review（前端审核列表依赖该状态）；
    # documents 表受 CHECK 约束（pending/parsing/completed/failed），waiting_review 落 'parsing'
    doc_status = (
        "parsed" if status == "completed"
        else "failed" if status == "failed"
        else "waiting_review" if status == "waiting_review"
        else "parsing"
    )

    # Map status to documents table status
    db_status = "completed" if status == "completed" else ("failed" if status == "failed" else "parsing")

    # Write to documents table
    content_type = guess_content_type(filename)
    existing = db.execute("SELECT created_at FROM documents WHERE id = ?", (doc_id,)).fetchone()
    created_at = existing["created_at"] if existing else now

    if existing:
        db.execute(
            """
            UPDATE documents
            SET filename = ?, content_type = ?, size = ?, status = ?,
                progress = ?, error = ?, updated_at = ?
            WHERE id = ?
            """,
            (filename, content_type, file_size, db_status, progress, error, now, doc_id),
        )
    else:
        db.execute(
            """
            INSERT INTO documents (
                id, filename, knowledge_base_id, folder_id, content_type,
                size, status, progress, error, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (doc_id, filename, knowledge_base_id, folder_id, content_type,
             file_size, db_status, progress, error, created_at, now),
        )
    db.commit()

    documents[doc_id] = {
        "id": doc_id,
        "name": filename,
        "type": ext.replace(".", ""),
        "size": file_size,
        "path": str(save_path),
        "content": "",
        "metadata": {"pipeline": "rag"},
        "knowledgeBaseId": knowledge_base_id,
        "folderId": folder_id,
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
        "knowledgeBaseId": knowledge_base_id,
        "folderId": folder_id,
        "category": "RAG Upload",
        "size": file_size,
        "createdAt": tasks.get(task_id, {}).get("createdAt", now),
        "startedAt": now if status in {"parsing", "completed", "failed", "waiting_review"} else None,
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


# ---------------------------------------------------------------------------
# Step 3: pipeline_checkpoints（人工审核中断/恢复的持久化断点）
#
# 语义对齐 LangGraph interrupt/checkpointer：Parse 阶段完成后若需人工审核，
# 在 enhance 节点前写断点并结束任务线程；POST /api/rag/review/{doc_id}
# approve 后从断点恢复（run_enhance_and_store_stage），reject 则终止为 failed。
# ---------------------------------------------------------------------------


def _slim_parse_result_for_checkpoint(parse_result: dict[str, Any]) -> dict[str, Any]:
    """parse_result 瘦身入库：保留审核展示与恢复所需字段。

    normalized_blocks 全量保留（approve 后 chunks 为空时需据此兜底重建）；
    chunks 只留前 3 段文本预览（各截 200 字），避免大文档撑爆单行 JSON。
    """
    chunks = parse_result.get("chunks") if isinstance(parse_result.get("chunks"), list) else []
    preview: list[str] = []
    for chunk in chunks[:3]:
        if isinstance(chunk, dict):
            text = str(chunk.get("text") or chunk.get("content") or "").strip()
            if text:
                preview.append(text[:200])
    return {
        "doc_id": parse_result.get("doc_id"),
        "parse_quality_score": parse_result.get("parse_quality_score"),
        "requires_review": bool(parse_result.get("requires_review")),
        "errors": parse_result.get("errors") if isinstance(parse_result.get("errors"), list) else [],
        "doc_strategy": parse_result.get("doc_strategy"),
        "parser_engine": parse_result.get("parser_engine"),
        "quality_metrics": parse_result.get("quality_metrics") if isinstance(parse_result.get("quality_metrics"), dict) else {},
        "chunks_count": len(chunks),
        "chunks_preview": preview,
        "normalized_blocks": parse_result.get("normalized_blocks") or [],
    }


def save_pipeline_checkpoint(
    *,
    doc_id: str,
    task_id: str,
    rag_payload: dict[str, Any],
    parse_result: dict[str, Any],
    paused_at_node: str,
    review_reason: str,
    status: str,
    knowledge_base_id: str = "kb-1",
    folder_id: str | None = None,
) -> None:
    """写/更新审核断点（doc_id 主键 upsert）。"""
    now = now_iso()
    payload_json = json.dumps(
        {
            "rag_payload": rag_payload,
            "knowledge_base_id": knowledge_base_id,
            "folder_id": folder_id,
        },
        ensure_ascii=False,
    )
    parse_result_json = json.dumps(
        _slim_parse_result_for_checkpoint(parse_result), ensure_ascii=False
    )
    existing = db.execute(
        "SELECT created_at FROM pipeline_checkpoints WHERE doc_id = ?", (doc_id,)
    ).fetchone()
    if existing:
        db.execute(
            """
            UPDATE pipeline_checkpoints
            SET task_id = ?, payload_json = ?, parse_result_json = ?,
                paused_at_node = ?, review_reason = ?, status = ?, updated_at = ?
            WHERE doc_id = ?
            """,
            (task_id, payload_json, parse_result_json, paused_at_node,
             review_reason, status, now, doc_id),
        )
    else:
        db.execute(
            """
            INSERT INTO pipeline_checkpoints (
                doc_id, task_id, payload_json, parse_result_json,
                paused_at_node, review_reason, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (doc_id, task_id, payload_json, parse_result_json,
             paused_at_node, review_reason, status, now, now),
        )
    db.commit()


def load_pipeline_checkpoint(doc_id: str) -> dict[str, Any] | None:
    """读取审核断点；JSON 字段已解析。无断点返回 None。"""
    row = db.execute(
        "SELECT * FROM pipeline_checkpoints WHERE doc_id = ?", (doc_id,)
    ).fetchone()
    if row is None:
        return None
    data = dict(row)
    for field, key in (("payload_json", "payload"), ("parse_result_json", "parse_result")):
        raw = data.pop(field, None)
        try:
            data[key] = json.loads(raw) if raw else {}
        except (TypeError, json.JSONDecodeError):
            data[key] = {}
    return data


def update_pipeline_checkpoint_status(doc_id: str, status: str) -> None:
    db.execute(
        "UPDATE pipeline_checkpoints SET status = ?, updated_at = ? WHERE doc_id = ?",
        (status, now_iso(), doc_id),
    )
    db.commit()


def delete_pipeline_checkpoint(doc_id: str) -> None:
    db.execute("DELETE FROM pipeline_checkpoints WHERE doc_id = ?", (doc_id,))
    db.commit()


def _finalize_rag_success(
    *,
    doc_id: str,
    filename: str,
    save_path: Path,
    knowledge_base_id: str,
    folder_id: str | None,
    slot: dict[str, Any],
    parse_result: dict[str, Any],
    enhance_result: dict[str, Any],
) -> None:
    """流水线成功收尾（正常路径与审核 approve 恢复路径共用）：

    slot 置 completed -> chunks 表重写 -> Qdrant 向量 upsert（best-effort）
    -> upsert completed。chunks 优先取 parse_result，审核恢复场景 parse 阶段
    跳过了 build_chunks，取 enhance_result（兜底构建后由 enhance 图回传）。
    """
    slot["status"] = "completed"
    slot["progress"] = 100
    slot["currentStage"] = "Stored"
    slot["updatedAt"] = now_iso()

    chunks_source = parse_result.get("chunks") or enhance_result.get("chunks") or []
    if isinstance(chunks_source, list):
        dict_chunks = [chunk for chunk in chunks_source if isinstance(chunk, dict)]
        now = now_iso()
        # Delete existing chunks for this doc
        db.execute("DELETE FROM chunks WHERE doc_id = ?", (doc_id,))
        # Insert new chunks. rag_pipeline chunks use the 'content' field
        # and carry no 'chunk_index', so text falls back to 'content'
        # and chunk_index falls back to the 1-based position. This must
        # stay consistent with Qdrant payload chunk_index so that hybrid
        # search can join keyword/semantic hits on (doc_id, chunk_index).
        for position, chunk in enumerate(dict_chunks):
            chunk_id = str(uuid4())
            chunk_index = chunk.get("chunk_index")
            if isinstance(chunk_index, bool) or not isinstance(chunk_index, int) or chunk_index < 1:
                chunk_index = position + 1
            text = chunk.get("text") or chunk.get("content", "")
            metadata = chunk.get("metadata", {})
            metadata_json = json.dumps(metadata, ensure_ascii=False) if isinstance(metadata, dict) else "{}"
            db.execute(
                """
                INSERT INTO chunks (id, doc_id, chunk_index, text, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (chunk_id, doc_id, chunk_index, text, metadata_json, now),
            )
        db.commit()

        # B6: upsert chunk vectors into Qdrant so semantic/hybrid search
        # can retrieve them. Best-effort: failures are logged only and
        # never break the pipeline. embeddings=None lets the vector
        # service generate 1024-dim fake embeddings, because the
        # rag_pipeline stub embeddings (dim=3) are incompatible with
        # the Qdrant collection (vector_size=1024).
        if vector_service is not None and dict_chunks:
            try:
                vector_service.upsert_vectors(
                    doc_id=f"doc-{doc_id}",
                    chunks=dict_chunks,
                    embeddings=None,
                    kb_id=knowledge_base_id,
                    folder_id=folder_id,
                )
            except Exception as vec_exc:
                print(f"Warning: Failed to upsert vectors for doc {doc_id}: {vec_exc}")

    upsert_rag_document_and_task(
        doc_id=doc_id,
        filename=filename,
        save_path=save_path,
        file_size=save_path.stat().st_size,
        parse_result=parse_result,
        enhance_result=enhance_result,
        status="completed",
        progress=100,
        current_stage="Stored",
        error=None,
        knowledge_base_id=knowledge_base_id,
        folder_id=folder_id,
    )


def _fail_rag_job(
    *,
    doc_id: str,
    filename: str,
    save_path: Path,
    knowledge_base_id: str,
    folder_id: str | None,
    slot: dict[str, Any],
    exc: Exception,
) -> None:
    """流水线失败收尾（正常路径与审核恢复路径共用）。"""
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
        knowledge_base_id=knowledge_base_id,
        folder_id=folder_id,
    )


async def run_rag_end_to_end_job(
    *,
    doc_id: str,
    rag_payload: dict[str, Any],
    save_path: Path,
    filename: str,
    knowledge_base_id: str = "kb-1",
    folder_id: str | None = None,
) -> None:
    """两阶段后台执行 RAG 流水线：Parse -> (人工审核中断点) -> Enhance+Index+Store。

    Parse 完成后若 parse_result.requires_review 为真，或 parse_quality_score
    低于 RAG_REVIEW_QUALITY_THRESHOLD，则写 pipeline_checkpoints
    （paused_at_node="enhance"）、状态置 waiting_review/Review/80 并结束
    任务线程；人工 approve 后由 run_rag_resume_after_approve_job 恢复。
    """
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
        knowledge_base_id=knowledge_base_id,
        folder_id=folder_id,
    )

    try:
        # ---- 阶段一：Parse ----
        parse_result = await asyncio.to_thread(service.run_parse_stage, rag_payload)
        slot["parse"] = parse_result
        slot["updatedAt"] = now_iso()

        # ---- 审核判定：质量门禁标记 或 质量分低于阈值 ----
        parse_score = parse_result.get("parse_quality_score")
        score_below_threshold = (
            isinstance(parse_score, (int, float))
            and not isinstance(parse_score, bool)
            and float(parse_score) < RAG_REVIEW_QUALITY_THRESHOLD
        )
        requires_review_flag = bool(parse_result.get("requires_review"))
        if requires_review_flag or score_below_threshold:
            reason_parts: list[str] = []
            if requires_review_flag:
                reason_parts.append("解析质量门禁要求人工审核")
            if score_below_threshold:
                reason_parts.append(
                    f"解析质量分 {float(parse_score):.2f} 低于阈值 {RAG_REVIEW_QUALITY_THRESHOLD:.2f}"
                )
            review_reason = "；".join(reason_parts)
            save_pipeline_checkpoint(
                doc_id=doc_id,
                task_id=f"rag-{doc_id}",
                rag_payload=rag_payload,
                parse_result=parse_result,
                paused_at_node="enhance",
                review_reason=review_reason,
                status="waiting_review",
                knowledge_base_id=knowledge_base_id,
                folder_id=folder_id,
            )
            slot["status"] = "waiting_review"
            slot["progress"] = 80
            slot["currentStage"] = "Review"
            slot["updatedAt"] = now_iso()
            upsert_rag_document_and_task(
                doc_id=doc_id,
                filename=filename,
                save_path=save_path,
                file_size=save_path.stat().st_size,
                parse_result=parse_result,
                enhance_result=None,
                status="waiting_review",
                progress=80,
                current_stage="Review",
                error=None,
                knowledge_base_id=knowledge_base_id,
                folder_id=folder_id,
            )
            return  # 任务线程结束，等待人工审核（POST /api/rag/review/{doc_id}）

        # ---- 阶段二：Enhance + Index + Store ----
        enhance_result = await asyncio.to_thread(
            service.run_enhance_and_store_stage, rag_payload, parse_result
        )
        slot["enhance"] = enhance_result
        _finalize_rag_success(
            doc_id=doc_id,
            filename=filename,
            save_path=save_path,
            knowledge_base_id=knowledge_base_id,
            folder_id=folder_id,
            slot=slot,
            parse_result=parse_result,
            enhance_result=enhance_result,
        )
    except Exception as exc:
        _fail_rag_job(
            doc_id=doc_id,
            filename=filename,
            save_path=save_path,
            knowledge_base_id=knowledge_base_id,
            folder_id=folder_id,
            slot=slot,
            exc=exc,
        )


async def run_rag_resume_after_approve_job(
    *,
    doc_id: str,
    rag_payload: dict[str, Any],
    parse_result: dict[str, Any],
    save_path: Path,
    filename: str,
    knowledge_base_id: str = "kb-1",
    folder_id: str | None = None,
) -> None:
    """人工 approve 后的恢复执行：从 enhance 节点继续跑完流水线。

    parse_result 来自 checkpoint（瘦身版，含 normalized_blocks 供兜底重建
    chunks）；成功后删除 checkpoint，失败走统一失败收尾（保留 checkpoint
    便于排查，retry 端点会清理后从头重跑）。
    """
    service = ensure_rag_pipeline_service()
    slot = rag_results.setdefault(doc_id, {})
    slot["status"] = "parsing"
    slot["progress"] = 85
    slot["currentStage"] = "Enhancing"
    slot["updatedAt"] = now_iso()
    slot.pop("errors", None)
    slot["parse"] = parse_result

    upsert_rag_document_and_task(
        doc_id=doc_id,
        filename=filename,
        save_path=save_path,
        file_size=save_path.stat().st_size,
        parse_result=parse_result,
        enhance_result=None,
        status="parsing",
        progress=85,
        current_stage="Enhancing",
        error=None,
        knowledge_base_id=knowledge_base_id,
        folder_id=folder_id,
    )

    try:
        enhance_result = await asyncio.to_thread(
            service.run_enhance_and_store_stage, rag_payload, parse_result
        )
        slot["enhance"] = enhance_result
        _finalize_rag_success(
            doc_id=doc_id,
            filename=filename,
            save_path=save_path,
            knowledge_base_id=knowledge_base_id,
            folder_id=folder_id,
            slot=slot,
            parse_result=parse_result,
            enhance_result=enhance_result,
        )
        delete_pipeline_checkpoint(doc_id)
    except Exception as exc:
        _fail_rag_job(
            doc_id=doc_id,
            filename=filename,
            save_path=save_path,
            knowledge_base_id=knowledge_base_id,
            folder_id=folder_id,
            slot=slot,
            exc=exc,
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
    elif status == "waiting_review":
        # 人工审核挂起中：状态原样透出（waiting_review/Review/80），
        # 并附带 checkpoint 中的审核原因供前端展示
        pass
    elif parse_requires_review or enhance_requires_review:
        status = "parsing"
        current_stage = "Review"
        progress = 80

    parse_chunks = parse_payload.get("chunks") if isinstance(parse_payload.get("chunks"), list) else []
    parse_chunks_count = len(parse_chunks)
    if parse_chunks_count == 0 and isinstance(parse_payload.get("chunks_count"), int):
        # checkpoint 瘦身版 parse_result 没有 chunks 列表，用预存计数展示
        parse_chunks_count = int(parse_payload.get("chunks_count"))
    embeddings = enhance_payload.get("embeddings") if isinstance(enhance_payload.get("embeddings"), list) else []

    review_reason: str | None = None
    if status == "waiting_review":
        checkpoint = load_pipeline_checkpoint(doc_id)
        if checkpoint is not None:
            raw_reason = checkpoint.get("review_reason")
            review_reason = str(raw_reason) if raw_reason else None

    return {
        "docId": doc_id,
        "sourceUri": slot.get("sourceUri"),
        "filename": slot.get("filename"),
        "updatedAt": slot.get("updatedAt"),
        "status": status,
        "progress": progress,
        "currentStage": current_stage,
        "error": "; ".join(errors) if errors else None,
        "reviewReason": review_reason,
        "parseScore": parse_score,
        "enhanceScore": enhance_score,
        "parseChunks": parse_chunks_count,
        "vectorCount": len(embeddings),
        "qaCount": len(enhance_payload.get("qa_pairs", [])) if isinstance(enhance_payload.get("qa_pairs"), list) else 0,
        "targetNodeId": slot.get("targetNodeId"),
        "targetNodeType": slot.get("targetNodeType"),
    }


def _count_documents_per_kb(kb_rows: list[dict[str, Any]]) -> dict[str, int]:
    """统计每个知识库（type=kb 节点）的文档数。

    两源合并、以 DB 为准去重：
    1. documents 表按 knowledge_base_id 分组计数；
    2. 内存 documents dict 中 id 不在 DB 的条目（常规上传未落库）补充计数，
       以其 knowledgeBaseId 字段归属；若该字段指向文件夹节点，则沿父链
       归并到所属知识库。
    """
    parent_map = {str(row["id"]): row["parent_id"] for row in kb_rows}
    kb_id_set = {str(row["id"]) for row in kb_rows if row["node_type"] == "kb"}

    def resolve_kb_id(node_id: str | None) -> str | None:
        """将 kb/文件夹节点 id 归并到其所属知识库 id（查不到返回 None）。"""
        seen: set[str] = set()
        current = node_id
        while current is not None and current not in seen:
            if current in kb_id_set:
                return current
            seen.add(current)
            current = parent_map.get(current)
        return None

    counts: dict[str, int] = {}
    db_doc_ids: set[str] = set()
    try:
        rows = db.execute("SELECT id, knowledge_base_id FROM documents").fetchall()
        for row in rows:
            db_doc_ids.add(str(row["id"]))
            kb_id = resolve_kb_id(row["knowledge_base_id"])
            if kb_id is not None:
                counts[kb_id] = counts.get(kb_id, 0) + 1
    except Exception as exc:
        print(f"Warning: Failed to count documents per kb: {exc}")

    for mem_doc_id, mem_doc in list(documents.items()):
        if not isinstance(mem_doc, dict):
            continue
        if str(mem_doc_id) in db_doc_ids:
            continue  # DB 已计入，去重
        raw_kb_id = mem_doc.get("knowledgeBaseId")
        kb_id = resolve_kb_id(str(raw_kb_id)) if raw_kb_id else None
        if kb_id is not None:
            counts[kb_id] = counts.get(kb_id, 0) + 1
    return counts


def build_kb_tree() -> list[dict[str, Any]]:
    rows = db.execute("SELECT * FROM kb_nodes ORDER BY created_at ASC").fetchall()
    all_rows = [dict(row) for row in rows]
    children_map: dict[str | None, list[dict[str, Any]]] = defaultdict(list)
    for row in all_rows:
        children_map[row["parent_id"]].append(row)

    # 实算各知识库文档数（DB + 内存两源合并，DB 为准去重）
    doc_counts = _count_documents_per_kb(all_rows)

    def build_node(row: dict[str, Any]) -> dict[str, Any]:
        node: dict[str, Any] = {
            "id": row["id"],
            "name": row["name"],
            "type": row["node_type"],
            "documentCount": (
                doc_counts.get(str(row["id"]), 0)
                if row["node_type"] == "kb"
                else row["document_count"]
            ),
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


def delete_document_everywhere(doc_id: str) -> None:
    """Cascade-delete a document from every store.

    Removes (idempotent, best-effort for external stores):
    1. rows in the chunks table
    2. the row in the documents table
    3. the in-memory ``documents`` dict entry
    4. the physical file under uploads/ (path taken from the in-memory entry)
    5. the parsed-data/{doc_id}.json artifact
    6. Qdrant vectors (payload doc_id uses the unified "doc-{id}" naming,
       consistent with the pipeline writes in process_document /
       run_rag_end_to_end_job)

    Note: DB deletions are NOT committed here; the caller is responsible for
    calling db.commit() so multi-document cascades stay in one transaction.
    """
    # 1 + 2: DB rows
    db.execute("DELETE FROM chunks WHERE doc_id = ?", (doc_id,))
    db.execute("DELETE FROM documents WHERE id = ?", (doc_id,))

    # 3: in-memory dict (+ the path needed for step 4)
    document = documents.pop(doc_id, None)

    # 4: physical upload file
    if isinstance(document, dict):
        raw_path = document.get("path")
        if raw_path:
            try:
                Path(str(raw_path)).unlink(missing_ok=True)
            except OSError as exc:
                print(f"Warning: Failed to delete upload file for doc {doc_id}: {exc}")

    # 5: parsed JSON artifact
    try:
        (PARSED_DIR / f"{doc_id}.json").unlink(missing_ok=True)
    except OSError as exc:
        print(f"Warning: Failed to delete parsed data for doc {doc_id}: {exc}")

    # 6: Qdrant vectors
    if vector_service is not None:
        try:
            vector_service.delete_vectors(f"doc-{doc_id}")
        except Exception as exc:
            print(f"Warning: Failed to delete vectors for doc {doc_id}: {exc}")


def delete_kb_node_recursively(node_id: str) -> None:
    """Delete a kb/folder node, its whole subtree, and every document inside.

    Documents are matched both by knowledge_base_id (covers nodes of type
    'kb') and by folder_id (covers folders in the subtree), across both the
    documents table and the in-memory documents dict (regular uploads only
    exist in memory). DB deletions are committed by the caller.
    """
    # Collect the whole subtree first; folder ids are needed to match documents.
    subtree_ids: list[str] = []

    def collect_subtree(current_id: str) -> None:
        subtree_ids.append(current_id)
        children = db.execute("SELECT id FROM kb_nodes WHERE parent_id = ?", (current_id,)).fetchall()
        for child in children:
            collect_subtree(str(child["id"]))

    collect_subtree(node_id)
    subtree_id_set = set(subtree_ids)

    # Find documents to cascade: kb_id match (kb nodes) OR folder_id match
    # (folders in the subtree), from the DB table ...
    placeholders = ",".join("?" * len(subtree_ids))
    doc_rows = db.execute(
        f"SELECT id FROM documents WHERE knowledge_base_id IN ({placeholders}) OR folder_id IN ({placeholders})",
        (*subtree_ids, *subtree_ids),
    ).fetchall()
    doc_ids: set[str] = {str(row["id"]) for row in doc_rows}

    # ... and from the in-memory dict (regular uploads are not in the DB table).
    for mem_doc_id, mem_doc in list(documents.items()):
        if not isinstance(mem_doc, dict):
            continue
        if mem_doc.get("knowledgeBaseId") in subtree_id_set or mem_doc.get("folderId") in subtree_id_set:
            doc_ids.add(str(mem_doc_id))

    for doc_id in doc_ids:
        delete_document_everywhere(doc_id)

    # Finally remove the kb_nodes rows themselves (children before parents).
    for subtree_id in reversed(subtree_ids):
        db.execute("DELETE FROM kb_nodes WHERE id = ?", (subtree_id,))


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


def resolve_upload_target_for_rag(target_node_id: str | None, node_type: str | None) -> tuple[str, str | None]:
    """Resolve knowledge_base_id and folder_id for RAG uploads."""
    default_kb_id = "kb-1"
    if target_node_id is None:
        return default_kb_id, None

    target_node = get_kb_node(target_node_id)
    if target_node is None:
        return default_kb_id, None

    if node_type == "kb" or target_node["node_type"] == "kb":
        return str(target_node["id"]), None

    if target_node["node_type"] == "folder":
        folder_id = str(target_node["id"])
        cursor = target_node
        while cursor is not None and cursor["node_type"] != "kb":
            parent_id = cursor["parent_id"]
            if parent_id is None:
                break
            cursor = get_kb_node(str(parent_id))

        if cursor is None or cursor["node_type"] != "kb":
            return default_kb_id, folder_id
        return str(cursor["id"]), folder_id

    return default_kb_id, None


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

        # 向量统一由下方 upsert_vectors 调 embedding_service 生成（OpenAI 兼容，
        # 无 key 时降级确定性假向量），此处不再本地计算，避免重复与维度不一致。
        for chunk in normalized_chunks:
            chunk.setdefault("vector", None)
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
        document["vectors"] = len(normalized_chunks)
        document["metadata"] = parser_metadata

        parsed_file_path = PARSED_DIR / f"{document_id}.json"
        parsed_file_path.write_text(
            json.dumps(
                {
                    "content": content,
                    "chunks": normalized_chunks,
                    # 向量不在此持久化：真实向量由 embedding_service 生成并写入 Qdrant
                    "vectors": None,
                    "metadata": parser_metadata,
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

        # B6: upsert chunk vectors into Qdrant so semantic/hybrid search can
        # retrieve this document. Best-effort: failures are logged only and
        # never break the parsing pipeline. embeddings=None delegates vector
        # generation to the unified embedding service (EMBEDDING_DIM, default
        # 1024; deterministic fake vectors when no API key is configured).
        # doc_id uses the unified "doc-{id}" naming, consistent with
        # delete_vectors() during cascade deletion.
        if vector_service is not None and normalized_chunks:
            try:
                vector_service.upsert_vectors(
                    doc_id=f"doc-{document_id}",
                    chunks=normalized_chunks,
                    embeddings=None,
                    kb_id=document.get("knowledgeBaseId"),
                    folder_id=document.get("folderId"),
                )
            except Exception as vec_exc:
                print(f"Warning: Failed to upsert vectors for doc {document_id}: {vec_exc}")

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


@app.get("/api/health")
async def api_health() -> dict[str, Any]:
    """服务级健康检查：上报各后端服务可用性（chat 反映 LLM 配置状态）。"""
    llm_configured = False
    if get_llm_client is not None:
        try:
            llm_configured = get_llm_client().is_configured
        except Exception:
            llm_configured = False
    return {
        "status": "ok",
        "timestamp": now_iso(),
        "services": {
            "vector": vector_service is not None,
            "search": search_service is not None,
            "enhance": enhance_service is not None,
            "annotation": annotation_service is not None,
            "chat": llm_configured,
        },
    }


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
    knowledgeBaseId: str | None = Form(default=None),
    nodeType: str | None = Form(default=None),
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
    # 存储上传目标节点信息（knowledgeBaseId 可能是知识库 ID 或文件夹 ID，取决于 nodeType）
    slot["targetNodeId"] = knowledgeBaseId
    slot["targetNodeType"] = nodeType
    slot["updatedAt"] = now_iso()

    # Resolve knowledge_base_id and folder_id
    resolved_kb_id, resolved_folder_id = resolve_upload_target_for_rag(knowledgeBaseId, nodeType)

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
        knowledge_base_id=resolved_kb_id,
        folder_id=resolved_folder_id,
    )
    asyncio.create_task(
        run_rag_end_to_end_job(
            doc_id=rag_doc_id,
            rag_payload=rag_payload,
            save_path=save_path,
            filename=filename,
            knowledge_base_id=resolved_kb_id,
            folder_id=resolved_folder_id,
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


@app.get("/api/rag/review/{doc_id}")
async def rag_review_detail(doc_id: str) -> dict[str, Any]:
    """人工审核详情：从 pipeline_checkpoints 返回断点信息与解析预览。"""
    ensure_rag_pipeline_service()
    checkpoint = load_pipeline_checkpoint(doc_id)
    if checkpoint is None:
        raise HTTPException(status_code=404, detail="Review checkpoint not found")

    parse_result = checkpoint.get("parse_result") or {}
    payload_ctx = checkpoint.get("payload") or {}
    rag_payload = payload_ctx.get("rag_payload") or {}

    preview_chunks = parse_result.get("chunks_preview") or []
    if not preview_chunks:
        # parse 阶段触发审核时会跳过 build_chunks（chunks_preview 为空），
        # 退而求其次用 normalized_blocks 前 3 段文本做预览
        for block in (parse_result.get("normalized_blocks") or [])[:3]:
            if isinstance(block, dict):
                text = str(block.get("text") or "").strip()
                if text:
                    preview_chunks.append(text[:200])

    return {
        "docId": doc_id,
        "filename": rag_payload.get("filename"),
        "reviewReason": checkpoint.get("review_reason"),
        "parseScore": parse_result.get("parse_quality_score"),
        "parseChunks": parse_result.get("chunks_count", 0),
        "previewChunks": preview_chunks[:3],
        "pausedAtNode": checkpoint.get("paused_at_node"),
        "status": checkpoint.get("status"),
        "createdAt": checkpoint.get("created_at"),
    }


@app.post("/api/rag/review/{doc_id}")
async def rag_review_action(doc_id: str, payload: RagReviewActionPayload) -> dict[str, Any]:
    """人工审核动作：approve 恢复流水线（enhance 节点续跑）；reject 终止为 failed。"""
    ensure_rag_pipeline_service()
    checkpoint = load_pipeline_checkpoint(doc_id)
    if checkpoint is None:
        raise HTTPException(status_code=404, detail="Review checkpoint not found")

    checkpoint_status = str(checkpoint.get("status") or "")
    if checkpoint_status != "waiting_review":
        raise HTTPException(
            status_code=409,
            detail=f"Checkpoint status is '{checkpoint_status}', only 'waiting_review' can be reviewed",
        )

    payload_ctx = checkpoint.get("payload") or {}
    rag_payload = payload_ctx.get("rag_payload") or {}
    parse_result = checkpoint.get("parse_result") or {}
    filename = str(rag_payload.get("filename") or doc_id)
    source_uri = rag_payload.get("source_uri")
    knowledge_base_id = str(payload_ctx.get("knowledge_base_id") or "kb-1")
    folder_id = payload_ctx.get("folder_id")
    folder_id = str(folder_id) if folder_id else None
    slot = rag_results.setdefault(doc_id, {})
    save_path = Path(str(source_uri)) if source_uri else None
    file_size = save_path.stat().st_size if save_path is not None and save_path.exists() else 0

    if payload.action == "reject":
        update_pipeline_checkpoint_status(doc_id, "rejected")
        notes = (payload.notes or "").strip()
        error_msg = f"审核驳回{(': ' + notes) if notes else ''}"
        slot["errors"] = [error_msg]
        slot["status"] = "failed"
        slot["progress"] = 100
        slot["currentStage"] = "Failed"
        slot["updatedAt"] = now_iso()
        upsert_rag_document_and_task(
            doc_id=doc_id,
            filename=filename,
            save_path=save_path if save_path is not None else Path(filename),
            file_size=file_size,
            parse_result=None,
            enhance_result=None,
            status="failed",
            progress=100,
            current_stage="Failed",
            error=error_msg,
            knowledge_base_id=knowledge_base_id,
            folder_id=folder_id,
        )
        return {
            "success": True,
            "docId": doc_id,
            "action": "reject",
            "state": build_rag_state_item(doc_id, slot),
        }

    # approve：标记断点后从 enhance 节点恢复执行
    if save_path is None or not save_path.exists():
        raise HTTPException(status_code=404, detail="RAG source file does not exist")
    update_pipeline_checkpoint_status(doc_id, "approved")
    slot["status"] = "parsing"
    slot["progress"] = 85
    slot["currentStage"] = "Enhancing"
    slot.pop("errors", None)
    slot["updatedAt"] = now_iso()
    asyncio.create_task(
        run_rag_resume_after_approve_job(
            doc_id=doc_id,
            rag_payload=rag_payload,
            parse_result=parse_result,
            save_path=save_path,
            filename=filename,
            knowledge_base_id=knowledge_base_id,
            folder_id=folder_id,
        )
    )
    return {
        "success": True,
        "docId": doc_id,
        "action": "approve",
        "state": build_rag_state_item(doc_id, slot),
    }


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
    # 兼容人工审核流：retry 一律清理历史 checkpoint（含 rejected），从头重跑
    delete_pipeline_checkpoint(doc_id)
    slot["status"] = "parsing"
    slot["progress"] = 10
    slot["currentStage"] = "Queued"
    slot.pop("errors", None)
    slot["updatedAt"] = now_iso()
    save_path = Path(str(source_uri))
    if not save_path.exists():
        raise HTTPException(status_code=404, detail="RAG source file does not exist")

    # Resolve knowledge_base_id and folder_id from slot
    target_node_id = slot.get("targetNodeId")
    node_type = slot.get("targetNodeType")
    resolved_kb_id, resolved_folder_id = resolve_upload_target_for_rag(target_node_id, node_type)

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
        knowledge_base_id=resolved_kb_id,
        folder_id=resolved_folder_id,
    )
    asyncio.create_task(
        run_rag_end_to_end_job(
            doc_id=doc_id,
            rag_payload=rag_payload,
            save_path=save_path,
            filename=str(filename),
            knowledge_base_id=resolved_kb_id,
            folder_id=resolved_folder_id,
        )
    )
    return {"success": True, "docId": doc_id, "accepted": True, "state": build_rag_state_item(doc_id, slot)}


@app.post("/api/search")
async def search_documents(payload: SearchPayload) -> dict[str, Any]:
    """
    Hybrid search endpoint supporting keyword, semantic, and hybrid modes.

    Args:
        payload: Search parameters with query, mode, kbIds, and limit

    Returns:
        Search results with highlighted excerpts
    """
    if search_service is None:
        raise HTTPException(status_code=503, detail="Search service is unavailable")

    # Validate mode
    if payload.mode not in {"keyword", "semantic", "hybrid"}:
        raise HTTPException(status_code=400, detail="mode must be 'keyword', 'semantic', or 'hybrid'")

    # Validate query
    if not payload.query or not payload.query.strip():
        raise HTTPException(status_code=400, detail="query is required")

    # Validate limit
    if payload.limit < 1 or payload.limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100")

    try:
        # Execute search
        results = search_service.hybrid_search(
            query=payload.query,
            kb_ids=payload.kbIds,
            mode=payload.mode,
            limit=payload.limit,
        )

        # Format results with highlighting
        formatted_results = search_service.format_results(results, payload.query)

        return {
            "results": formatted_results,
            "total": len(formatted_results),
            "query": payload.query,
            "mode": payload.mode,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Search failed: {exc}") from exc


# ---------------------------------------------------------------------------
# Step 2: RAG 问答（POST /api/chat，SSE 流式）
# ---------------------------------------------------------------------------

_TOKEN_SENTINEL = object()


def _next_token(iterator: Any) -> Any:
    """同步迭代器安全取值：耗尽返回哨兵，供 asyncio.to_thread 调用。

    直接 to_thread(next, it) 会把 StopIteration 泄漏为 RuntimeError，
    用哨兵显式区分"结束"与"异常"（异常照常抛出，由调用方捕获）。
    """
    try:
        return next(iterator)
    except StopIteration:
        return _TOKEN_SENTINEL


def _sse_event(payload: dict[str, Any]) -> str:
    """SSE 事件帧：data: {json}\\n\\n（ensure_ascii=False 保留中文）。"""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.post("/api/chat")
async def chat(payload: ChatPayload) -> Any:
    """RAG 问答端点。

    stream=True  -> SSE（text/event-stream）：
        status(可选，仅 CRAG 重检索时，必在 sources 前) -> sources -> token* -> done；
        异常时下发 error 事件。
    stream=False -> JSON：{"answer": str, "sources": [...]}。
    LLM 未配置/异常时由 chat_service 内部降级，保证始终有可用响应。
    """
    if chat_service is None:
        raise HTTPException(status_code=503, detail="Chat service is unavailable")

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    if not payload.stream:
        try:
            return await asyncio.to_thread(
                chat_service.answer,
                payload.mode,
                message,
                payload.history,
                payload.kbIds,
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc

    # 检索（含 CRAG 重检索循环）+ prompt 构造为同步阻塞调用，放线程池避免阻塞事件循环
    try:
        sources, token_iter, retrieval_meta = await asyncio.to_thread(
            chat_service.answer_stream,
            payload.mode,
            message,
            payload.history,
            payload.kbIds,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}") from exc

    async def event_stream() -> Any:
        # CRAG 重检索提示事件（Step 3 新增）。
        # 前端契约：未知事件类型必须被安全忽略，旧版本前端不受该事件影响；
        # 新前端可据此在 UI 上展示"正在优化检索…"的中间状态。
        # 该事件仅在发生了查询重写重检索时发出，且必须位于 sources 事件之前；
        # sources 事件的内容始终是最终合并去重后的检索结果。
        if retrieval_meta.get("rewritten"):
            yield _sse_event({"type": "status", "message": "正在优化检索…"})
        yield _sse_event({"type": "sources", "sources": sources})
        try:
            while True:
                # chat_stream 是同步迭代器，逐段在线程池拉取
                token = await asyncio.to_thread(_next_token, token_iter)
                if token is _TOKEN_SENTINEL:
                    break
                yield _sse_event({"type": "token", "content": token})
        except Exception as exc:
            yield _sse_event({"type": "error", "message": str(exc)})
            return
        yield _sse_event({"type": "done"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def _qa_to_frontend(row: dict[str, Any]) -> dict[str, Any]:
    """Map a SQLite QA record to the frontend QA contract (camelCase)."""
    chunk_index = row.get("chunk_index")
    variations = row.get("variations") or []
    qa_id = row.get("id")
    return {
        "id": str(qa_id) if qa_id is not None else "",
        "question": row.get("question", ""),
        "answer": row.get("answer", ""),
        "sourceDocument": row.get("filename") or "",
        "sourceLocation": f"片段 {chunk_index}" if chunk_index is not None else "",
        "confidence": row.get("confidence", 0.0),
        "status": row.get("status", "pending"),
        "variations": variations if isinstance(variations, list) else [],
        "createdAt": row.get("created_at") or "",
    }


@app.post("/api/enhance/generate-qa")
async def generate_qa_endpoint(payload: GenerateQAPayload) -> dict[str, Any]:
    """
    Generate QA pairs from document chunks.

    Args:
        payload: Generation parameters with docId, optional chunkIds, and count

    Returns:
        Generated QA pairs with questions, answers, and confidence scores
    """
    if enhance_service is None:
        raise HTTPException(status_code=503, detail="Enhance service is unavailable")

    # Validate document exists
    doc_row = db.execute(
        "SELECT id, filename FROM documents WHERE id = ?", (payload.docId,)
    ).fetchone()
    if doc_row is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {payload.docId}")

    # Validate count
    if payload.count < 1 or payload.count > 10:
        raise HTTPException(status_code=400, detail="count must be between 1 and 10")

    try:
        # Generate QA pairs
        qa_pairs = enhance_service.generate_qa(
            doc_id=payload.docId,
            chunk_ids=payload.chunkIds,
            count=payload.count,
        )

        # Persist generated QA pairs (status=pending, entering review workflow)
        if qa_pairs:
            save_result = enhance_service.save_qa_pairs(qa_pairs, payload.docId)
        else:
            save_result = {"success": True, "count": 0, "qa_pairs": []}

        # Enrich saved records with document/chunk context for frontend display
        saved_records = save_result.get("qa_pairs", [])
        for record, generated in zip(saved_records, qa_pairs):
            record["filename"] = doc_row["filename"]
            record["chunk_index"] = generated.get("source_chunk_index")

        return {
            "success": True,
            "docId": payload.docId,
            "qaPairs": [_qa_to_frontend(record) for record in saved_records],
            "totalGenerated": len(qa_pairs),
            "saved": save_result["count"],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"QA generation failed: {exc}") from exc


@app.post("/api/enhance/generalize")
async def generalize_question_endpoint(payload: GeneralizeQuestionPayload) -> dict[str, Any]:
    """
    Generate question variations for improved retrieval.

    Args:
        payload: Question and count of variations to generate

    Returns:
        Original question and list of variations
    """
    if enhance_service is None:
        raise HTTPException(status_code=503, detail="Enhance service is unavailable")

    # Validate question
    if not payload.question or not payload.question.strip():
        raise HTTPException(status_code=400, detail="question is required")

    # Validate count
    if payload.count < 1 or payload.count > 20:
        raise HTTPException(status_code=400, detail="count must be between 1 and 20")

    try:
        result = enhance_service.generalize_question(
            question=payload.question,
            count=payload.count,
        )

        return {
            "success": True,
            "original": result["original"],
            "originalQuestion": result["original"],
            "variations": result["variations"],
            "count": len(result["variations"]),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Question generalization failed: {exc}") from exc


# QA 审核工作流状态值域（与前端 enhanceStore 对齐）
_QA_REVIEW_STATUSES = {"pending", "approved", "rejected"}


@app.get("/api/enhance/qa-pairs")
async def get_all_qa_pairs_endpoint(status: str | None = None) -> dict[str, Any]:
    """
    Retrieve QA pairs across all documents.

    Args:
        status: Optional status filter ('pending', 'approved', 'rejected')

    Returns:
        List of QA pairs in frontend camelCase contract
    """
    if enhance_service is None:
        raise HTTPException(status_code=503, detail="Enhance service is unavailable")

    if status and status not in _QA_REVIEW_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="status must be 'pending', 'approved', or 'rejected'",
        )

    try:
        qa_pairs = enhance_service.get_all_qa_pairs(status=status)
        return {
            "success": True,
            "qaPairs": [_qa_to_frontend(row) for row in qa_pairs],
            "total": len(qa_pairs),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve QA pairs: {exc}") from exc


@app.get("/api/enhance/qa-pairs/{doc_id}")
async def get_qa_pairs_endpoint(doc_id: str, status: str | None = None) -> dict[str, Any]:
    """
    Retrieve QA pairs for a document.

    Args:
        doc_id: Document identifier
        status: Optional status filter ('pending', 'approved', 'rejected')

    Returns:
        List of QA pairs with questions, answers, and variations
    """
    if enhance_service is None:
        raise HTTPException(status_code=503, detail="Enhance service is unavailable")

    # Validate document exists
    doc_row = db.execute("SELECT id, filename FROM documents WHERE id = ?", (doc_id,)).fetchone()
    if doc_row is None:
        raise HTTPException(status_code=404, detail=f"Document not found: {doc_id}")

    # Validate status if provided
    if status and status not in _QA_REVIEW_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="status must be 'pending', 'approved', or 'rejected'",
        )

    try:
        qa_pairs = enhance_service.get_qa_pairs(doc_id=doc_id, status=status)

        return {
            "success": True,
            "docId": doc_id,
            "filename": doc_row["filename"],
            "qaPairs": [_qa_to_frontend(row) for row in qa_pairs],
            "total": len(qa_pairs),
            "status": status,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve QA pairs: {exc}") from exc


def _update_qa_status(qa_id: str, status: str) -> dict[str, Any]:
    """Shared approve/reject logic with uniform error mapping."""
    if enhance_service is None:
        raise HTTPException(status_code=503, detail="Enhance service is unavailable")
    try:
        return enhance_service.update_qa_status(qa_id, status)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to update QA status: {exc}") from exc


@app.post("/api/enhance/qa/{qa_id}/approve")
async def approve_qa_endpoint(qa_id: str) -> dict[str, Any]:
    """Approve a QA pair (status -> approved)."""
    return _update_qa_status(qa_id, "approved")


@app.post("/api/enhance/qa/{qa_id}/reject")
async def reject_qa_endpoint(qa_id: str) -> dict[str, Any]:
    """Reject a QA pair (status -> rejected)."""
    return _update_qa_status(qa_id, "rejected")


class BatchApproveQAPayload(BaseModel):
    qaIds: list[str]


@app.post("/api/enhance/qa/batch-approve")
async def batch_approve_qa_endpoint(payload: BatchApproveQAPayload) -> dict[str, Any]:
    """Batch approve QA pairs."""
    if enhance_service is None:
        raise HTTPException(status_code=503, detail="Enhance service is unavailable")
    if not payload.qaIds:
        raise HTTPException(status_code=400, detail="qaIds is required")
    try:
        return enhance_service.batch_update_qa_status(payload.qaIds, "approved")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to batch approve QA pairs: {exc}") from exc


@app.post("/api/annotation/create")
async def create_annotation_task_endpoint(payload: CreateAnnotationTaskPayload) -> dict[str, Any]:
    """
    Create a new annotation task for a document.

    Args:
        payload: Contains docId

    Returns:
        Created annotation task
    """
    if annotation_service is None:
        raise HTTPException(status_code=503, detail="Annotation service is unavailable")

    try:
        task = annotation_service.create_annotation_task(payload.docId)
        return {
            "success": True,
            "task": task,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create annotation task: {exc}") from exc


@app.get("/api/annotation/tasks")
async def get_annotation_tasks_endpoint(status: str | None = None) -> dict[str, Any]:
    """
    Get annotation tasks, optionally filtered by status.

    Args:
        status: Optional status filter ('pending', 'annotated', 'approved', 'rejected')

    Returns:
        List of annotation tasks
    """
    if annotation_service is None:
        raise HTTPException(status_code=503, detail="Annotation service is unavailable")

    # Validate status if provided
    if status and status not in {"pending", "annotated", "approved", "rejected"}:
        raise HTTPException(
            status_code=400,
            detail="status must be 'pending', 'annotated', 'approved', or 'rejected'"
        )

    try:
        tasks = annotation_service.get_annotation_tasks(status=status)
        return {
            "success": True,
            "tasks": tasks,
            "total": len(tasks),
            "status": status,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve annotation tasks: {exc}") from exc


@app.post("/api/annotation/auto-annotate/{doc_id}")
async def auto_annotate_endpoint(doc_id: str) -> dict[str, Any]:
    """
    Perform automatic annotation on a document.

    Args:
        doc_id: Document identifier

    Returns:
        Auto-annotation results with entities, keywords, and classification
    """
    if annotation_service is None:
        raise HTTPException(status_code=503, detail="Annotation service is unavailable")

    try:
        result = annotation_service.auto_annotate(doc_id)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Auto-annotation failed: {exc}") from exc


@app.post("/api/annotation/save")
async def save_annotation_endpoint(payload: SaveAnnotationPayload) -> dict[str, Any]:
    """
    Save manual annotations for a task.

    Args:
        payload: Contains taskId and annotations data

    Returns:
        Success confirmation
    """
    if annotation_service is None:
        raise HTTPException(status_code=503, detail="Annotation service is unavailable")

    try:
        result = annotation_service.save_manual_annotation(payload.taskId, payload.annotations)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save annotation: {exc}") from exc


@app.post("/api/annotation/approve/{task_id}")
async def approve_annotation_task_endpoint(task_id: str, payload: ApproveTaskPayload) -> dict[str, Any]:
    """
    Approve an annotation task.

    Args:
        task_id: Annotation task identifier
        payload: Contains optional reviewer name

    Returns:
        Updated task status
    """
    if annotation_service is None:
        raise HTTPException(status_code=503, detail="Annotation service is unavailable")

    try:
        result = annotation_service.approve_task(task_id, payload.reviewer)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to approve task: {exc}") from exc


@app.post("/api/annotation/reject/{task_id}")
async def reject_annotation_task_endpoint(task_id: str, payload: RejectTaskPayload) -> dict[str, Any]:
    """
    Reject an annotation task.

    Args:
        task_id: Annotation task identifier
        payload: Contains optional reviewer name and rejection reason

    Returns:
        Updated task status
    """
    if annotation_service is None:
        raise HTTPException(status_code=503, detail="Annotation service is unavailable")

    try:
        result = annotation_service.reject_task(task_id, payload.reviewer, payload.reason)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to reject task: {exc}") from exc


@app.get("/api/annotation/tasks/{task_id}")
async def get_annotation_task_endpoint(task_id: str) -> dict[str, Any]:
    """
    Get a single annotation task by ID.

    Args:
        task_id: Annotation task identifier

    Returns:
        Annotation task details with document info
    """
    if annotation_service is None:
        raise HTTPException(status_code=503, detail="Annotation service is unavailable")

    try:
        task = annotation_service.get_annotation_task(task_id)
        return {
            "success": True,
            "task": task,
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve annotation task: {exc}") from exc


