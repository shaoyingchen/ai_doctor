"""
Annotation Service - Handles document annotation tasks, auto-annotation, and review workflows.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from uuid import uuid4


def now_iso() -> str:
    """Return current UTC timestamp in ISO format."""
    return datetime.utcnow().isoformat() + "Z"


class AnnotationService:
    """Service for managing annotation tasks and workflows."""

    def __init__(self, db: Any) -> None:
        """
        Initialize the annotation service.

        Args:
            db: SQLite database connection with row_factory set to sqlite3.Row,
                or a thread-safe wrapper exposing the sqlite3.Connection API
                subset (execute/commit), e.g. ThreadSafeDB from app.py
        """
        self.db = db
        self._ensure_tables()

    def _ensure_tables(self) -> None:
        """Ensure annotation_tasks table exists."""
        self.db.execute(
            """
            CREATE TABLE IF NOT EXISTS annotation_tasks (
              id TEXT PRIMARY KEY,
              doc_id TEXT NOT NULL,
              status TEXT DEFAULT 'pending',
              auto_annotations TEXT,
              manual_annotations TEXT,
              reviewer TEXT,
              created_at TEXT NOT NULL,
              reviewed_at TEXT,
              FOREIGN KEY (doc_id) REFERENCES documents(id)
            )
            """
        )
        self.db.commit()

    def create_annotation_task(self, doc_id: str) -> dict[str, Any]:
        """
        Create a new annotation task for a document.

        Args:
            doc_id: Document identifier

        Returns:
            Created annotation task
        """
        # Verify document exists
        doc_row = self.db.execute("SELECT id, filename FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if doc_row is None:
            raise ValueError(f"Document not found: {doc_id}")

        # Check if task already exists
        existing = self.db.execute("SELECT id FROM annotation_tasks WHERE doc_id = ?", (doc_id,)).fetchone()
        if existing:
            raise ValueError(f"Annotation task already exists for document: {doc_id}")

        task_id = str(uuid4())
        now = now_iso()

        self.db.execute(
            """
            INSERT INTO annotation_tasks (
              id, doc_id, status, created_at
            ) VALUES (?, ?, 'pending', ?)
            """,
            (task_id, doc_id, now),
        )
        self.db.commit()

        return {
            "id": task_id,
            "docId": doc_id,
            "filename": doc_row["filename"],
            "status": "pending",
            "autoAnnotations": None,
            "manualAnnotations": None,
            "reviewer": None,
            "createdAt": now,
            "reviewedAt": None,
        }

    def get_annotation_tasks(self, status: str | None = None) -> list[dict[str, Any]]:
        """
        Get annotation tasks, optionally filtered by status.

        Args:
            status: Optional status filter ('pending', 'annotated', 'approved', 'rejected')

        Returns:
            List of annotation tasks
        """
        if status:
            query = """
                SELECT
                    t.id, t.doc_id, t.status, t.auto_annotations, t.manual_annotations,
                    t.reviewer, t.created_at, t.reviewed_at,
                    d.filename
                FROM annotation_tasks t
                JOIN documents d ON t.doc_id = d.id
                WHERE t.status = ?
                ORDER BY t.created_at DESC
            """
            rows = self.db.execute(query, (status,)).fetchall()
        else:
            query = """
                SELECT
                    t.id, t.doc_id, t.status, t.auto_annotations, t.manual_annotations,
                    t.reviewer, t.created_at, t.reviewed_at,
                    d.filename
                FROM annotation_tasks t
                JOIN documents d ON t.doc_id = d.id
                ORDER BY t.created_at DESC
            """
            rows = self.db.execute(query).fetchall()

        tasks = []
        for row in rows:
            auto_annotations = json.loads(row["auto_annotations"]) if row["auto_annotations"] else None
            manual_annotations = json.loads(row["manual_annotations"]) if row["manual_annotations"] else None

            tasks.append({
                "id": row["id"],
                "docId": row["doc_id"],
                "filename": row["filename"],
                "status": row["status"],
                "autoAnnotations": auto_annotations,
                "manualAnnotations": manual_annotations,
                "reviewer": row["reviewer"],
                "createdAt": row["created_at"],
                "reviewedAt": row["reviewed_at"],
            })

        return tasks

    def auto_annotate(self, doc_id: str) -> dict[str, Any]:
        """
        Perform automatic annotation on a document (entity extraction, keywords, classification).

        Args:
            doc_id: Document identifier

        Returns:
            Auto-annotation results
        """
        # Get document chunks
        chunk_rows = self.db.execute(
            "SELECT text FROM chunks WHERE doc_id = ? ORDER BY chunk_index",
            (doc_id,)
        ).fetchall()

        if not chunk_rows:
            raise ValueError(f"No chunks found for document: {doc_id}")

        # Combine chunks for annotation
        full_text = " ".join(row["text"] for row in chunk_rows)

        # Perform auto-annotation using mock implementation
        # In production, this would call the NLP annotator service
        annotations = self._run_auto_annotation(full_text)

        # Update or create annotation task
        task_row = self.db.execute("SELECT id FROM annotation_tasks WHERE doc_id = ?", (doc_id,)).fetchone()

        if task_row:
            task_id = task_row["id"]
            self.db.execute(
                """
                UPDATE annotation_tasks
                SET auto_annotations = ?, status = 'annotated'
                WHERE id = ?
                """,
                (json.dumps(annotations, ensure_ascii=False), task_id),
            )
        else:
            # Create task if it doesn't exist
            task_id = str(uuid4())
            now = now_iso()
            self.db.execute(
                """
                INSERT INTO annotation_tasks (
                  id, doc_id, status, auto_annotations, created_at
                ) VALUES (?, ?, 'annotated', ?, ?)
                """,
                (task_id, doc_id, json.dumps(annotations, ensure_ascii=False), now),
            )

        self.db.commit()

        return {
            "success": True,
            "taskId": task_id,
            "docId": doc_id,
            "annotations": annotations,
        }

    def _run_auto_annotation(self, text: str) -> dict[str, Any]:
        """
        Run auto-annotation using mock implementation.

        Args:
            text: Text to annotate

        Returns:
            Annotation results with entities, keywords, and categories
        """
        import re
        from collections import defaultdict

        entities: list[dict[str, Any]] = []
        keywords: list[dict[str, Any]] = []

        # Extract entities
        time_regex = re.compile(r"\d{4}-\d{2}-\d{2}|\d{4}年\d{1,2}月\d{1,2}日")
        number_regex = re.compile(r"\d+(?:\.\d+)?(?:%|万|亿|元)?")
        org_regex = re.compile(r"[一-龥]{2,20}(?:公司|集团|局|部|委|院|校|中心|政府)")

        for match in time_regex.finditer(text):
            entities.append({
                "type": "time",
                "value": match.group(),
                "confidence": 0.85,
                "start": match.start(),
                "end": match.end(),
            })

        for match in number_regex.finditer(text):
            if len(match.group()) > 1:
                entities.append({
                    "type": "number",
                    "value": match.group(),
                    "confidence": 0.7,
                    "start": match.start(),
                    "end": match.end(),
                })

        for match in org_regex.finditer(text):
            entities.append({
                "type": "organization",
                "value": match.group(),
                "confidence": 0.8,
                "start": match.start(),
                "end": match.end(),
            })

        # Extract keywords
        words = [w for w in re.split(r"[\s,，。！？；：()\n]+", text) if len(w) > 1]
        word_freq: dict[str, int] = defaultdict(int)
        for word in words:
            word_freq[word] += 1

        for word, freq in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:15]:
            keywords.append({
                "keyword": word,
                "confidence": min(0.95, 0.5 + freq / max(1, len(words))),
                "frequency": freq,
            })

        # Classify document
        category = "其他"
        if "政策" in text or "条例" in text:
            category = "政策文件"
        elif "技术" in text or "架构" in text:
            category = "技术方案"
        elif "合同" in text or "协议" in text:
            category = "合同"
        elif "医疗" in text or "诊断" in text:
            category = "医疗文档"

        return {
            "entities": entities[:30],
            "keywords": keywords,
            "category": category,
            "confidence": 0.75,
        }

    def save_manual_annotation(self, task_id: str, annotations: dict[str, Any]) -> dict[str, Any]:
        """
        Save manual annotations for a task.

        Args:
            task_id: Annotation task identifier
            annotations: Manual annotation data

        Returns:
            Updated task
        """
        task_row = self.db.execute("SELECT id, doc_id FROM annotation_tasks WHERE id = ?", (task_id,)).fetchone()
        if task_row is None:
            raise ValueError(f"Annotation task not found: {task_id}")

        self.db.execute(
            """
            UPDATE annotation_tasks
            SET manual_annotations = ?, status = 'annotated'
            WHERE id = ?
            """,
            (json.dumps(annotations, ensure_ascii=False), task_id),
        )
        self.db.commit()

        return {
            "success": True,
            "taskId": task_id,
            "docId": task_row["doc_id"],
            "status": "annotated",
        }

    def approve_task(self, task_id: str, reviewer: str | None = None) -> dict[str, Any]:
        """
        Approve an annotation task.

        Args:
            task_id: Annotation task identifier
            reviewer: Optional reviewer name

        Returns:
            Updated task
        """
        task_row = self.db.execute("SELECT id, doc_id FROM annotation_tasks WHERE id = ?", (task_id,)).fetchone()
        if task_row is None:
            raise ValueError(f"Annotation task not found: {task_id}")

        now = now_iso()
        self.db.execute(
            """
            UPDATE annotation_tasks
            SET status = 'approved', reviewer = ?, reviewed_at = ?
            WHERE id = ?
            """,
            (reviewer, now, task_id),
        )
        self.db.commit()

        return {
            "success": True,
            "taskId": task_id,
            "docId": task_row["doc_id"],
            "status": "approved",
            "reviewer": reviewer,
            "reviewedAt": now,
        }

    def reject_task(self, task_id: str, reviewer: str | None = None, reason: str | None = None) -> dict[str, Any]:
        """
        Reject an annotation task.

        Args:
            task_id: Annotation task identifier
            reviewer: Optional reviewer name
            reason: Optional rejection reason

        Returns:
            Updated task
        """
        # NOTE: sqlite3.Row 无 .get() 方法，且需显式 SELECT 出 manual_annotations 列
        task_row = self.db.execute(
            "SELECT id, doc_id, manual_annotations FROM annotation_tasks WHERE id = ?",
            (task_id,),
        ).fetchone()
        if task_row is None:
            raise ValueError(f"Annotation task not found: {task_id}")

        now = now_iso()

        # Store rejection reason in manual_annotations if provided
        if reason:
            current_manual = task_row["manual_annotations"]
            manual_data = json.loads(current_manual) if current_manual else {}
            manual_data["rejectionReason"] = reason
            manual_json = json.dumps(manual_data, ensure_ascii=False)

            self.db.execute(
                """
                UPDATE annotation_tasks
                SET status = 'rejected', reviewer = ?, reviewed_at = ?, manual_annotations = ?
                WHERE id = ?
                """,
                (reviewer, now, manual_json, task_id),
            )
        else:
            self.db.execute(
                """
                UPDATE annotation_tasks
                SET status = 'rejected', reviewer = ?, reviewed_at = ?
                WHERE id = ?
                """,
                (reviewer, now, task_id),
            )

        self.db.commit()

        return {
            "success": True,
            "taskId": task_id,
            "docId": task_row["doc_id"],
            "status": "rejected",
            "reviewer": reviewer,
            "reviewedAt": now,
            "reason": reason,
        }

    def get_annotation_task(self, task_id: str) -> dict[str, Any]:
        """
        Get a single annotation task by ID.

        Args:
            task_id: Annotation task identifier

        Returns:
            Annotation task details
        """
        query = """
            SELECT
                t.id, t.doc_id, t.status, t.auto_annotations, t.manual_annotations,
                t.reviewer, t.created_at, t.reviewed_at,
                d.filename, d.content_type, d.size
            FROM annotation_tasks t
            JOIN documents d ON t.doc_id = d.id
            WHERE t.id = ?
        """
        row = self.db.execute(query, (task_id,)).fetchone()

        if row is None:
            raise ValueError(f"Annotation task not found: {task_id}")

        auto_annotations = json.loads(row["auto_annotations"]) if row["auto_annotations"] else None
        manual_annotations = json.loads(row["manual_annotations"]) if row["manual_annotations"] else None

        return {
            "id": row["id"],
            "docId": row["doc_id"],
            "filename": row["filename"],
            "contentType": row["content_type"],
            "size": row["size"],
            "status": row["status"],
            "autoAnnotations": auto_annotations,
            "manualAnnotations": manual_annotations,
            "reviewer": row["reviewer"],
            "createdAt": row["created_at"],
            "reviewedAt": row["reviewed_at"],
        }
