"""统一的 Embedding 接入层（OpenAI 兼容协议）。

环境变量：
    EMBEDDING_BASE_URL  默认跟随 LLM_BASE_URL（智谱 GLM）
    EMBEDDING_API_KEY   默认跟随 LLM_API_KEY；未设置时降级为确定性 hash 假向量
    EMBEDDING_MODEL     默认 embedding-3
    EMBEDDING_DIM       默认 1024（与现有 Qdrant collection 一致）

兼容智谱 GLM / OpenAI 等所有 OpenAI 兼容 embedding 端点：
    - 智谱:  EMBEDDING_MODEL=embedding-3      EMBEDDING_DIM=1024/2048
    - OpenAI: EMBEDDING_MODEL=text-embedding-3-small EMBEDDING_DIM=1536

降级策略：
    未配置 API Key 时，embed_texts 返回确定性 hash 假向量（维度=EMBEDDING_DIM），
    保证检索链路在无 key 环境下仍可运行；仅首次降级时 logger.warning 一次。
    API 调用异常时同样降级假向量（每次都 warning，避免静默故障）。

HTTP 客户端策略：优先 openai SDK，缺失时回退 httpx 直连 REST。
"""

from __future__ import annotations

import hashlib
import logging
import os
import threading
from typing import Any, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "embedding-3"
DEFAULT_DIM = 1024
MAX_BATCH_SIZE = 64  # 智谱 embedding 接口单次上限为 64 条

# 进程内降级提示只发一次
_fake_warned = False
_fake_warn_lock = threading.Lock()


def _warn_fake_once(reason: str, dim: int, every_time: bool = False) -> None:
    """降级提示：默认只在进程内首次降级时 warning 一次，避免日志刷屏。"""
    global _fake_warned
    if every_time:
        logger.warning("[EmbeddingService] %s，本次降级为确定性 hash 假向量(dim=%d)", reason, dim)
        return
    with _fake_warn_lock:
        if _fake_warned:
            return
        _fake_warned = True
    logger.warning(
        "[EmbeddingService] %s，降级为确定性 hash 假向量(dim=%d)；"
        "检索结果不具备真实语义，仅用于无 key 环境下链路验证",
        reason, dim,
    )


def _fake_embed(text: str, dim: int) -> List[float]:
    """确定性 hash 假向量：同一文本稳定输出同一向量，值域 [-1, 1]。"""
    seed = hashlib.sha256(text.encode("utf-8")).digest()
    values: List[float] = []
    counter = 0
    while len(values) < dim:
        for byte in seed:
            values.append(round((byte / 255.0) * 2 - 1, 6))
            if len(values) >= dim:
                break
        counter += 1
        seed = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
    return values


class EmbeddingService:
    """OpenAI 兼容 Embedding 客户端（线程安全单例）。"""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        dim: Optional[int] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.base_url = (
            base_url
            or os.getenv("EMBEDDING_BASE_URL")
            or os.getenv("LLM_BASE_URL")
            or "https://open.bigmodel.cn/api/paas/v4"
        ).rstrip("/")
        self.api_key = (
            api_key
            if api_key is not None
            else (os.getenv("EMBEDDING_API_KEY") or os.getenv("LLM_API_KEY", ""))
        )
        self.model = model or os.getenv("EMBEDDING_MODEL") or DEFAULT_MODEL
        try:
            self.dim = int(dim if dim is not None else os.getenv("EMBEDDING_DIM", DEFAULT_DIM))
        except (TypeError, ValueError):
            self.dim = DEFAULT_DIM
        try:
            self.timeout = float(timeout if timeout is not None else os.getenv("EMBEDDING_TIMEOUT", 60))
        except (TypeError, ValueError):
            self.timeout = 60.0

        self._client: Any = None  # openai.OpenAI 实例（SDK 可用时）

        if not self.is_configured:
            _warn_fake_once("EMBEDDING_API_KEY 未配置", self.dim)
            return

        try:
            from openai import OpenAI

            self._client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.timeout,
            )
            logger.info(
                "[EmbeddingService] 已配置(OpenAI SDK): base_url=%s model=%s dim=%d",
                self.base_url, self.model, self.dim,
            )
        except ImportError:
            logger.warning(
                "[EmbeddingService] openai SDK 未安装，回退 httpx 直连 REST: "
                "base_url=%s model=%s dim=%d（建议 pip install openai）",
                self.base_url, self.model, self.dim,
            )

    @property
    def is_configured(self) -> bool:
        """是否已配置 API Key。"""
        return bool(self.api_key and self.api_key.strip())

    # ------------------------------------------------------------------
    # 批量向量化
    # ------------------------------------------------------------------
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """批量向量化，返回与 texts 等长的向量列表（维度=EMBEDDING_DIM）。

        未配置 key 或 API 异常时降级为确定性 hash 假向量，不中断调用方。
        """
        if not texts:
            return []
        if not self.is_configured:
            _warn_fake_once("EMBEDDING_API_KEY 未配置", self.dim)
            return [_fake_embed(t, self.dim) for t in texts]

        try:
            vectors: List[List[float]] = []
            for start in range(0, len(texts), MAX_BATCH_SIZE):
                batch = texts[start:start + MAX_BATCH_SIZE]
                vectors.extend(self._embed_batch(batch))
            return vectors
        except Exception as exc:  # noqa: BLE001 - 降级兜底，不中断链路
            _warn_fake_once(f"Embedding API 调用异常: {exc}", self.dim, every_time=True)
            return [_fake_embed(t, self.dim) for t in texts]

    def _embed_batch(self, batch: List[str]) -> List[List[float]]:
        if self._client is not None:
            resp = self._client.embeddings.create(model=self.model, input=batch)
            return [item.embedding for item in resp.data]
        return self._embed_batch_via_httpx(batch)

    def _embed_batch_via_httpx(self, batch: List[str]) -> List[List[float]]:
        import httpx

        resp = httpx.post(
            f"{self.base_url}/embeddings",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json={"model": self.model, "input": batch},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        items = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in items]


# ----------------------------------------------------------------------
# 线程安全单例
# ----------------------------------------------------------------------
_embedding_service: Optional[EmbeddingService] = None
_embedding_lock = threading.Lock()


def get_embedding_service() -> EmbeddingService:
    """获取 EmbeddingService 单例（线程安全，双重检查锁）。"""
    global _embedding_service
    if _embedding_service is None:
        with _embedding_lock:
            if _embedding_service is None:
                _embedding_service = EmbeddingService()
    return _embedding_service


__all__ = ["EmbeddingService", "get_embedding_service"]
