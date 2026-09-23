"""
Enhanced QA Generation and Generalization Service

Provides API for generating question-answer pairs from document chunks
and creating question variations for improved retrieval coverage.

Generation strategy: call the unified LLM client (OpenAI-compatible) first;
fall back to built-in templates when LLM_API_KEY is not configured or the
LLM call fails, so the API keeps working in offline/dev environments.
"""

from __future__ import annotations

import json
import logging
import threading
from datetime import datetime
from typing import Any
from uuid import uuid4

from services.llm_client import LLMNotConfigured, get_llm_client

logger = logging.getLogger(__name__)

# 进程内"LLM 未配置"降级提示只发一次，避免按 chunk 刷屏
_llm_fallback_warned = False
_llm_fallback_lock = threading.Lock()


def _warn_llm_not_configured_once() -> None:
    global _llm_fallback_warned
    with _llm_fallback_lock:
        if _llm_fallback_warned:
            return
        _llm_fallback_warned = True
    logger.warning(
        "[EnhanceService] LLM_API_KEY 未配置，QA 生成/问题泛化降级为模板逻辑"
        "（配置 LLM_API_KEY 后自动切换为真实大模型生成）"
    )


def _extract_json_array(content: str) -> list[Any] | None:
    """从 LLM 响应中稳健提取 JSON 数组（容忍前后多余文字/代码块）。"""
    text = content.strip()
    if text.startswith("```"):
        # 去掉 markdown 代码块围栏
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, list) else None
    except json.JSONDecodeError:
        pass
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start:end + 1])
        return parsed if isinstance(parsed, list) else None
    except json.JSONDecodeError:
        return None


def now_iso() -> str:
    """Return current UTC timestamp in ISO format."""
    return datetime.utcnow().isoformat() + "Z"


class EnhanceService:
    """Service for QA generation and question generalization."""

    def __init__(self, db: Any):
        """
        Initialize enhance service with database connection.

        Args:
            db: SQLite database connection or a thread-safe wrapper exposing
                the sqlite3.Connection API subset (execute/commit),
                e.g. ThreadSafeDB from app.py
        """
        self.db = db
        self._ensure_qa_table()

    def _ensure_qa_table(self) -> None:
        """Create qa_pairs table if it doesn't exist."""
        self.db.execute(
            """
            CREATE TABLE IF NOT EXISTS qa_pairs (
                id TEXT PRIMARY KEY,
                doc_id TEXT NOT NULL,
                chunk_id TEXT,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                variations TEXT,
                confidence REAL,
                status TEXT DEFAULT 'pending',
                created_at TEXT NOT NULL,
                FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE CASCADE
            )
            """
        )
        self.db.execute("CREATE INDEX IF NOT EXISTS idx_qa_doc ON qa_pairs(doc_id)")
        self.db.execute("CREATE INDEX IF NOT EXISTS idx_qa_status ON qa_pairs(status)")
        self.db.commit()

    def generate_qa(
        self,
        doc_id: str,
        chunk_ids: list[str] | None = None,
        count: int = 3,
    ) -> list[dict[str, Any]]:
        """
        Generate QA pairs from document chunks.

        Calls the unified LLM client when configured; otherwise falls back
        to template-based generation so the API keeps working offline.

        Args:
            doc_id: Document identifier
            chunk_ids: Optional list of specific chunk IDs (if None, uses all chunks)
            count: Maximum number of QA pairs to generate per chunk

        Returns:
            List of QA pair dictionaries with:
                - question: Generated question
                - answer: Generated answer
                - source_chunk_id: Source chunk identifier
                - confidence: Confidence score (0.0-1.0)
        """
        # Fetch chunks from database
        if chunk_ids:
            placeholders = ",".join("?" * len(chunk_ids))
            query = f"""
                SELECT id, doc_id, chunk_index, text, metadata
                FROM chunks
                WHERE doc_id = ? AND id IN ({placeholders})
                ORDER BY chunk_index
            """
            params = [doc_id, *chunk_ids]
        else:
            query = """
                SELECT id, doc_id, chunk_index, text, metadata
                FROM chunks
                WHERE doc_id = ?
                ORDER BY chunk_index
            """
            params = [doc_id]

        rows = self.db.execute(query, params).fetchall()

        if not rows:
            return []

        qa_pairs: list[dict[str, Any]] = []

        for row in rows:
            chunk_id = row["id"]
            text = row["text"]
            chunk_index = row["chunk_index"]

            # Generate QA pairs using simulated LLM logic
            generated = self._mock_llm_generate_qa(text, count, chunk_index)

            for qa in generated:
                qa_pairs.append({
                    "question": qa["question"],
                    "answer": qa["answer"],
                    "source_chunk_id": chunk_id,
                    "source_chunk_index": chunk_index,
                    "confidence": qa["confidence"],
                })

        return qa_pairs

    def _mock_llm_generate_qa(
        self,
        text: str,
        count: int,
        chunk_index: int,
    ) -> list[dict[str, Any]]:
        """
        Generate QA pairs for a chunk: LLM first, template fallback.

        Args:
            text: Chunk text content
            count: Number of QA pairs to generate
            chunk_index: Index of the chunk

        Returns:
            List of generated QA pairs
        """
        llm = get_llm_client()
        if not llm.is_configured:
            _warn_llm_not_configured_once()
            return self._template_generate_qa(text, count)
        try:
            return self._llm_generate_qa(llm, text, count)
        except LLMNotConfigured:
            _warn_llm_not_configured_once()
        except Exception as exc:  # noqa: BLE001 - 任何 LLM 异常都降级，不中断接口
            logger.warning("[EnhanceService] LLM QA 生成失败，降级模板: %s", exc)
        return self._template_generate_qa(text, count)

    def _llm_generate_qa(self, llm: Any, text: str, count: int) -> list[dict[str, Any]]:
        """调用 LLM 基于 chunk 内容生成 QA 对（JSON 数组返回并校验）。"""
        prompt = (
            f"请基于以下文档片段生成 {count} 个问答对。\n"
            "要求：\n"
            "1. 问题必须能由片段内容直接回答，不要编造片段之外的信息；\n"
            "2. 答案简洁准确，尽量引用片段原文；\n"
            "3. 严格返回 JSON 数组，不要输出其他文字，"
            "格式：[{\"question\": \"...\", \"answer\": \"...\"}]\n\n"
            f"文档片段：\n{text[:2000]}"
        )
        content = llm.chat(
            messages=[
                {
                    "role": "system",
                    "content": "你是医学知识库的问答对生成助手，只输出符合要求的 JSON 数组。",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=2048,
        )
        items = _extract_json_array(content)
        if not items:
            raise ValueError(f"LLM 响应未包含可解析的 JSON 数组: {content[:120]!r}")

        qa_pairs: list[dict[str, Any]] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            question = str(item.get("question", "")).strip()
            answer = str(item.get("answer", "")).strip()
            if question and answer:
                qa_pairs.append({"question": question, "answer": answer, "confidence": 0.9})
        if not qa_pairs:
            raise ValueError("LLM 响应 JSON 数组中无有效 QA 对")
        return qa_pairs[:count]

    def _template_generate_qa(self, text: str, count: int) -> list[dict[str, Any]]:
        """模板降级：生成简单的模板化问题（无 LLM 时的兜底）。"""
        qa_pairs: list[dict[str, Any]] = []

        # Generate different types of questions
        templates = [
            ("这段内容的主要观点是什么？", 0.85),
            ("请概括这段文字的核心内容。", 0.80),
            ("这段话讲述了什么？", 0.75),
            ("这部分的重点是什么？", 0.70),
            ("这段文字的关键信息有哪些？", 0.65),
        ]

        for idx in range(min(count, len(templates))):
            question, base_confidence = templates[idx]
            # Use first 200 chars as answer
            answer = text[:200] if len(text) > 200 else text

            qa_pairs.append({
                "question": question,
                "answer": answer,
                "confidence": base_confidence,
            })

        return qa_pairs

    def generalize_question(
        self,
        question: str,
        count: int = 5,
    ) -> dict[str, Any]:
        """
        Generate question variations for improved retrieval.

        Creates paraphrased versions of the input question to increase
        the likelihood of matching user queries.

        Args:
            question: Original question text
            count: Number of variations to generate

        Returns:
            Dictionary with:
                - original: Original question
                - variations: List of generated question variations
        """
        variations = self._mock_llm_generalize(question, count)

        return {
            "original": question,
            "variations": variations,
        }

    def _mock_llm_generalize(self, question: str, count: int) -> list[str]:
        """
        Generate question variations: LLM first, template fallback.

        Args:
            question: Original question
            count: Number of variations to generate

        Returns:
            List of question variations
        """
        llm = get_llm_client()
        if not llm.is_configured:
            _warn_llm_not_configured_once()
            return self._template_generalize(question, count)
        try:
            return self._llm_generalize(llm, question, count)
        except LLMNotConfigured:
            _warn_llm_not_configured_once()
        except Exception as exc:  # noqa: BLE001 - 任何 LLM 异常都降级，不中断接口
            logger.warning("[EnhanceService] LLM 问题泛化失败，降级模板: %s", exc)
        return self._template_generalize(question, count)

    def _llm_generalize(self, llm: Any, question: str, count: int) -> list[str]:
        """调用 LLM 对问题做同义改写（JSON 数组返回并校验）。"""
        prompt = (
            f"请将下面的问题改写成 {count} 个语义相同但表述不同的问句。\n"
            "要求：\n"
            "1. 保持原意，不改变问题指向；\n"
            "2. 表述自然多样，覆盖口语化与书面化表达；\n"
            "3. 严格返回 JSON 数组，不要输出其他文字，"
            "格式：[\"问句1\", \"问句2\"]\n\n"
            f"原问题：{question}"
        )
        content = llm.chat(
            messages=[
                {
                    "role": "system",
                    "content": "你是问题改写助手，只输出符合要求的 JSON 数组。",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=1024,
        )
        items = _extract_json_array(content)
        if not items:
            raise ValueError(f"LLM 响应未包含可解析的 JSON 数组: {content[:120]!r}")

        variations = [str(item).strip() for item in items if str(item).strip()]
        # 过滤与原问题完全相同的项，保证“泛化”有意义
        variations = [v for v in variations if v != question.strip()]
        if not variations:
            raise ValueError("LLM 响应 JSON 数组中无有效泛化问句")
        return variations[:count]

    def _template_generalize(self, question: str, count: int) -> list[str]:
        """模板降级：基于前缀/后缀模板拼接泛化问句（无 LLM 时的兜底）。"""
        # Template-based variations
        prefixes = [
            "请问，",
            "能否告诉我，",
            "我想知道，",
            "可以说明一下",
            "帮我解释一下",
        ]

        suffixes = [
            "吗？",
            "呢？",
            "？谢谢。",
            "好吗？",
            "？",
        ]

        variations: list[str] = []

        # Remove existing question marks for variation generation
        base_question = question.rstrip("？?。.")

        # Generate variations with different structures
        for idx in range(min(count, len(prefixes))):
            if idx < 2:
                # Prefix variations
                variations.append(f"{prefixes[idx]}{base_question}{suffixes[idx]}")
            elif idx < 4:
                # Direct variations
                variations.append(f"{base_question}{suffixes[idx]}")
            else:
                # More formal variations
                variations.append(f"关于{base_question}的问题")

        return variations[:count]

    def save_qa_pairs(
        self,
        qa_pairs: list[dict[str, Any]],
        doc_id: str,
    ) -> dict[str, Any]:
        """
        Save generated QA pairs to database.

        Args:
            qa_pairs: List of QA pair dictionaries (from generate_qa)
            doc_id: Document identifier

        Returns:
            Dictionary with operation status, saved count and the saved
            records (including generated ids) under "qa_pairs"
        """
        if not qa_pairs:
            return {"success": True, "count": 0, "qa_pairs": []}

        now = now_iso()
        saved_count = 0
        saved_records: list[dict[str, Any]] = []

        for qa in qa_pairs:
            qa_id = str(uuid4())
            chunk_id = qa.get("source_chunk_id")
            question = qa.get("question", "")
            answer = qa.get("answer", "")
            confidence = qa.get("confidence", 0.0)

            # Generate variations for the question
            variations_result = self.generalize_question(question, count=3)
            variations_text = ",".join(variations_result["variations"])

            self.db.execute(
                """
                INSERT INTO qa_pairs (
                    id, doc_id, chunk_id, question, answer,
                    variations, confidence, status, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    qa_id,
                    doc_id,
                    chunk_id,
                    question,
                    answer,
                    variations_text,
                    confidence,
                    # 新生成的 QA 进入待审核状态，与前端 pending/approved/rejected 工作流对齐
                    "pending",
                    now,
                ),
            )
            saved_count += 1
            saved_records.append({
                "id": qa_id,
                "doc_id": doc_id,
                "chunk_id": chunk_id,
                "question": question,
                "answer": answer,
                "variations": variations_result["variations"],
                "confidence": confidence,
                "status": "pending",
                "created_at": now,
            })

        self.db.commit()

        return {
            "success": True,
            "count": saved_count,
            "doc_id": doc_id,
            "qa_pairs": saved_records,
        }

    def get_qa_pairs(
        self,
        doc_id: str,
        status: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Retrieve QA pairs for a document.

        Args:
            doc_id: Document identifier
            status: Optional status filter ('pending', 'approved', 'rejected';
                legacy values 'active'/'archived' also accepted)

        Returns:
            List of QA pair dictionaries (含 filename / chunk_index，便于前端展示)
        """
        where = "q.doc_id = ?"
        params: list[Any] = [doc_id]
        if status:
            where += " AND q.status = ?"
            params.append(status)
        query = f"""
            SELECT q.id, q.doc_id, q.chunk_id, q.question, q.answer,
                   q.variations, q.confidence, q.status, q.created_at,
                   d.filename AS filename, c.chunk_index AS chunk_index
            FROM qa_pairs q
            LEFT JOIN documents d ON d.id = q.doc_id
            LEFT JOIN chunks c ON c.id = q.chunk_id
            WHERE {where}
            ORDER BY q.created_at DESC
        """
        rows = self.db.execute(query, params).fetchall()
        return [self._row_to_qa_dict(row) for row in rows]

    def get_all_qa_pairs(self, status: str | None = None) -> list[dict[str, Any]]:
        """
        Retrieve QA pairs across all documents.

        Args:
            status: Optional status filter ('pending', 'approved', 'rejected')

        Returns:
            List of QA pair dictionaries (含 filename / chunk_index)
        """
        where = "1=1"
        params: list[Any] = []
        if status:
            where = "q.status = ?"
            params.append(status)
        query = f"""
            SELECT q.id, q.doc_id, q.chunk_id, q.question, q.answer,
                   q.variations, q.confidence, q.status, q.created_at,
                   d.filename AS filename, c.chunk_index AS chunk_index
            FROM qa_pairs q
            LEFT JOIN documents d ON d.id = q.doc_id
            LEFT JOIN chunks c ON c.id = q.chunk_id
            WHERE {where}
            ORDER BY q.created_at DESC
        """
        rows = self.db.execute(query, params).fetchall()
        return [self._row_to_qa_dict(row) for row in rows]

    @staticmethod
    def _row_to_qa_dict(row: Any) -> dict[str, Any]:
        """将 qa_pairs 联表查询行转换为字典（variations 拆分为列表）。"""
        variations_text = row["variations"] or ""
        variations = [v.strip() for v in variations_text.split(",") if v.strip()]
        return {
            "id": row["id"],
            "doc_id": row["doc_id"],
            "chunk_id": row["chunk_id"],
            "question": row["question"],
            "answer": row["answer"],
            "variations": variations,
            "confidence": row["confidence"],
            "status": row["status"],
            "created_at": row["created_at"],
            "filename": row["filename"],
            "chunk_index": row["chunk_index"],
        }

    def update_qa_status(self, qa_id: str, status: str) -> dict[str, Any]:
        """
        Update review status of a single QA pair.

        Args:
            qa_id: QA pair identifier
            status: Target status ('approved' or 'rejected')

        Returns:
            Dictionary with operation status

        Raises:
            ValueError: QA pair not found
        """
        row = self.db.execute("SELECT id FROM qa_pairs WHERE id = ?", (qa_id,)).fetchone()
        if row is None:
            raise ValueError(f"QA pair not found: {qa_id}")

        self.db.execute("UPDATE qa_pairs SET status = ? WHERE id = ?", (status, qa_id))
        self.db.commit()

        return {
            "success": True,
            "qaId": qa_id,
            "status": status,
        }

    def batch_update_qa_status(self, qa_ids: list[str], status: str) -> dict[str, Any]:
        """
        Batch update review status of QA pairs.

        Args:
            qa_ids: List of QA pair identifiers
            status: Target status ('approved' or 'rejected')

        Returns:
            Dictionary with operation status and the ids actually updated
        """
        updated: list[str] = []
        for qa_id in qa_ids:
            cursor = self.db.execute(
                "UPDATE qa_pairs SET status = ? WHERE id = ?",
                (status, qa_id),
            )
            if cursor.rowcount and cursor.rowcount > 0:
                updated.append(qa_id)
        self.db.commit()

        return {
            "success": True,
            "updated": updated,
            "count": len(updated),
        }
