"""统一的 LLM 接入层（OpenAI 兼容协议）。

环境变量：
    LLM_BASE_URL  默认 https://open.bigmodel.cn/api/paas/v4 （智谱 GLM）
    LLM_API_KEY   未设置时 is_configured=False，调用方据此降级
    LLM_MODEL     默认 glm-4-flash
    LLM_TIMEOUT   默认 60（秒）

兼容智谱 GLM / DeepSeek / OpenAI 等所有 OpenAI 兼容端点：
    - 智谱:  LLM_BASE_URL=https://open.bigmodel.cn/api/paas/v4  LLM_MODEL=glm-4-flash
    - DeepSeek: LLM_BASE_URL=https://api.deepseek.com/v1        LLM_MODEL=deepseek-chat
    - OpenAI:   LLM_BASE_URL=https://api.openai.com/v1          LLM_MODEL=gpt-4o-mini

HTTP 客户端策略：
    优先使用 openai SDK（requirements.txt 已声明 openai>=1.40）；
    未安装时回退到 httpx 直连 REST（openai SDK 本身就是薄封装，语义一致）。
"""

from __future__ import annotations

import json
import logging
import os
import threading
from typing import Any, Dict, Iterator, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
DEFAULT_MODEL = "glm-4-flash"
DEFAULT_TIMEOUT = 60.0


class LLMNotConfigured(Exception):
    """LLM 未配置（缺少 API Key）时抛出，调用方应捕获并走降级逻辑。"""


class LLMClient:
    """OpenAI 兼容 LLM 客户端（线程安全单例）。

    同步方法，供 asyncio.to_thread 包装调用。
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> None:
        self.base_url = (
            base_url or os.getenv("LLM_BASE_URL") or DEFAULT_BASE_URL
        ).rstrip("/")
        self.api_key = api_key if api_key is not None else os.getenv("LLM_API_KEY", "")
        self.model = model or os.getenv("LLM_MODEL") or DEFAULT_MODEL
        try:
            self.timeout = float(timeout if timeout is not None else os.getenv("LLM_TIMEOUT", DEFAULT_TIMEOUT))
        except (TypeError, ValueError):
            self.timeout = DEFAULT_TIMEOUT

        self._client: Any = None  # openai.OpenAI 实例（SDK 可用时）

        if not self.is_configured:
            logger.warning(
                "[LLMClient] LLM_API_KEY 未配置，LLM 能力处于未启用状态，"
                "调用方将走降级逻辑（LLMNotConfigured）。"
            )
            return

        # 优先 openai SDK，缺失时回退 httpx 直连 REST
        try:
            from openai import OpenAI

            self._client = OpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                timeout=self.timeout,
            )
            logger.info(
                "[LLMClient] 已配置(OpenAI SDK): base_url=%s model=%s timeout=%ss",
                self.base_url, self.model, self.timeout,
            )
        except ImportError:
            logger.warning(
                "[LLMClient] openai SDK 未安装，回退 httpx 直连 REST: "
                "base_url=%s model=%s timeout=%ss（建议 pip install openai）",
                self.base_url, self.model, self.timeout,
            )

    @property
    def is_configured(self) -> bool:
        """是否已配置 API Key（有 key 才算 configured）。"""
        return bool(self.api_key and self.api_key.strip())

    # ------------------------------------------------------------------
    # 同步非流式调用
    # ------------------------------------------------------------------
    def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 2048,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> str:
        """同步对话，返回文本内容。未配置时抛 LLMNotConfigured。"""
        if not self.is_configured:
            raise LLMNotConfigured(
                "LLM_API_KEY 未配置，无法调用大模型（请配置环境变量或 backend/.env）"
            )
        if self._client is not None:
            return self._chat_via_sdk(messages, temperature, max_tokens, response_format)
        return self._chat_via_httpx(messages, temperature, max_tokens, response_format)

    def _chat_via_sdk(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: Optional[Dict[str, Any]],
    ) -> str:
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format is not None:
            kwargs["response_format"] = response_format
        resp = self._client.chat.completions.create(**kwargs)
        return resp.choices[0].message.content or ""

    def _chat_via_httpx(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        response_format: Optional[Dict[str, Any]],
    ) -> str:
        import httpx

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format is not None:
            payload["response_format"] = response_format
        resp = httpx.post(
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=self.timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"].get("content") or ""

    # ------------------------------------------------------------------
    # 同步流式调用（Step 2 SSE 将使用）
    # ------------------------------------------------------------------
    def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> Iterator[str]:
        """同步流式对话，逐块 yield 文本。未配置时抛 LLMNotConfigured。"""
        if not self.is_configured:
            raise LLMNotConfigured(
                "LLM_API_KEY 未配置，无法调用大模型（请配置环境变量或 backend/.env）"
            )
        if self._client is not None:
            yield from self._chat_stream_via_sdk(messages, temperature, max_tokens)
        else:
            yield from self._chat_stream_via_httpx(messages, temperature, max_tokens)

    def _chat_stream_via_sdk(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> Iterator[str]:
        stream = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        for chunk in stream:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            content = getattr(delta, "content", None)
            if content:
                yield content

    def _chat_stream_via_httpx(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> Iterator[str]:
        import httpx

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        with httpx.stream(
            "POST",
            f"{self.base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=self.timeout,
        ) as resp:
            resp.raise_for_status()
            for line in resp.iter_lines():
                if not line:
                    continue
                line = line.strip()
                if not line.startswith("data:"):
                    continue
                data_str = line[len("data:"):].strip()
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                except json.JSONDecodeError:
                    continue
                choices = data.get("choices") or []
                if not choices:
                    continue
                content = (choices[0].get("delta") or {}).get("content")
                if content:
                    yield content


# ----------------------------------------------------------------------
# 线程安全单例
# ----------------------------------------------------------------------
_llm_client: Optional[LLMClient] = None
_llm_lock = threading.Lock()


def get_llm_client() -> LLMClient:
    """获取 LLMClient 单例（线程安全，双重检查锁）。"""
    global _llm_client
    if _llm_client is None:
        with _llm_lock:
            if _llm_client is None:
                _llm_client = LLMClient()
    return _llm_client


__all__ = ["LLMClient", "LLMNotConfigured", "get_llm_client"]
