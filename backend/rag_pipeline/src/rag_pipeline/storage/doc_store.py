from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Protocol


class DocStore(Protocol):
    def upsert_document(self, doc: dict) -> None: ...
    def upsert_blocks(self, doc_id: str, blocks: list[dict]) -> None: ...
    def upsert_chunks(self, doc_id: str, chunks: list[dict]) -> None: ...
    def load_chunks(self, doc_id: str) -> list[dict]: ...


class InMemoryDocStore:
    """内存 DocStore，支持可选的写穿透 JSON 落盘（解决进程重启即失问题）。

    persist_path 为 None 时保持纯内存行为（接口签名不变）；
    传入路径后：构造时若文件存在则加载，此后每次写操作整体 dump 落盘
    （tmp 文件 + os.replace 原子替换，避免崩溃写坏数据文件）。
    所有读写由 threading.RLock 串行化，线程安全。
    """

    def __init__(self, persist_path: str | Path | None = None) -> None:
        self._lock = threading.RLock()
        self._persist_path = Path(persist_path) if persist_path else None
        self.documents: dict[str, dict] = {}
        self.blocks: dict[str, list[dict]] = {}
        self.chunks: dict[str, list[dict]] = {}
        self._load()

    def _load(self) -> None:
        if self._persist_path is None or not self._persist_path.exists():
            return
        try:
            data = json.loads(self._persist_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                self.documents = dict(data.get("documents") or {})
                self.blocks = dict(data.get("blocks") or {})
                self.chunks = dict(data.get("chunks") or {})
        except Exception as exc:  # 数据文件损坏不阻断启动，置空重来
            print(f"Warning: Failed to load doc store from {self._persist_path}: {exc}")
            self.documents, self.blocks, self.chunks = {}, {}, {}

    def _save_locked(self) -> None:
        """落盘（调用方须已持有 self._lock）。"""
        if self._persist_path is None:
            return
        try:
            self._persist_path.parent.mkdir(parents=True, exist_ok=True)
            payload = {
                "documents": self.documents,
                "blocks": self.blocks,
                "chunks": self.chunks,
            }
            tmp_path = self._persist_path.with_suffix(self._persist_path.suffix + ".tmp")
            tmp_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
            os.replace(tmp_path, self._persist_path)
        except Exception as exc:  # 落盘失败仅告警，不阻断流水线
            print(f"Warning: Failed to persist doc store to {self._persist_path}: {exc}")

    def upsert_document(self, doc: dict) -> None:
        with self._lock:
            self.documents[doc["doc_id"]] = doc
            self._save_locked()

    def upsert_blocks(self, doc_id: str, blocks: list[dict]) -> None:
        with self._lock:
            self.blocks[doc_id] = blocks
            self._save_locked()

    def upsert_chunks(self, doc_id: str, chunks: list[dict]) -> None:
        with self._lock:
            self.chunks[doc_id] = chunks
            self._save_locked()

    def load_chunks(self, doc_id: str) -> list[dict]:
        with self._lock:
            return self.chunks.get(doc_id, [])
