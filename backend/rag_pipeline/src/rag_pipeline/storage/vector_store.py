from __future__ import annotations

import json
import os
import threading
from pathlib import Path
from typing import Protocol


class VectorStore(Protocol):
    def upsert_embeddings(self, doc_id: str, embeddings: list[dict]) -> None: ...


class InMemoryVectorStore:
    """内存 VectorStore，支持可选的写穿透 JSON 落盘（与 InMemoryDocStore 同策略）。

    persist_path 为 None 时保持纯内存行为（接口签名不变）；
    传入路径后：构造时若文件存在则加载，此后每次写操作整体 dump 落盘
    （tmp 文件 + os.replace 原子替换）。RLock 保证线程安全。
    """

    def __init__(self, persist_path: str | Path | None = None) -> None:
        self._lock = threading.RLock()
        self._persist_path = Path(persist_path) if persist_path else None
        self.rows: dict[str, list[dict]] = {}
        self._load()

    def _load(self) -> None:
        if self._persist_path is None or not self._persist_path.exists():
            return
        try:
            data = json.loads(self._persist_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                self.rows = dict(data.get("rows") or {})
        except Exception as exc:  # 数据文件损坏不阻断启动，置空重来
            print(f"Warning: Failed to load vector store from {self._persist_path}: {exc}")
            self.rows = {}

    def _save_locked(self) -> None:
        """落盘（调用方须已持有 self._lock）。"""
        if self._persist_path is None:
            return
        try:
            self._persist_path.parent.mkdir(parents=True, exist_ok=True)
            tmp_path = self._persist_path.with_suffix(self._persist_path.suffix + ".tmp")
            tmp_path.write_text(
                json.dumps({"rows": self.rows}, ensure_ascii=False), encoding="utf-8"
            )
            os.replace(tmp_path, self._persist_path)
        except Exception as exc:  # 落盘失败仅告警，不阻断流水线
            print(f"Warning: Failed to persist vector store to {self._persist_path}: {exc}")

    def upsert_embeddings(self, doc_id: str, embeddings: list[dict]) -> None:
        with self._lock:
            self.rows[doc_id] = embeddings
            self._save_locked()
