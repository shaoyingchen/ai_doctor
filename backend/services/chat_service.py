"""RAG 问答服务（Step 2 + Step 3 CRAG 重检索）。

职责：
    1. retrieve: 基于 SearchService.hybrid_search 检索相关片段（支持多知识库合并）
    2. crag_retrieve: CRAG（Corrective RAG）重检索循环——retrieve -> grade
       充分性 -> 不充分则 rewrite query 重检索 -> 多轮结果合并去重
    3. build_messages: 按 qa / create / analyze 三种模式构造 LLM messages
    4. answer: 非流式问答，LLM 未配置或异常时降级为检索摘要
    5. answer_stream: 流式问答，返回 (sources, token 迭代器, retrieval_meta)，
       降级路径一次性产出完整文本

降级策略（保证前端永远有可用响应）：
    LLM 未配置（LLMNotConfigured）或调用异常时，返回
    "LLM 未配置，以下是检索到的相关资料片段：" + 各片段摘要（标注来源）。

CRAG grade/rewrite 策略：
    grade（充分性判定）——LLM 已配置时调用模型输出 JSON
    {"sufficient": bool, "rewritten_query": str}；未配置/调用失败时走启发式
    （top1 score >= 30 且 chunks >= 2 视为充分）。
    rewrite（query 改写）——优先采用 LLM 返回的 rewritten_query；否则启发式
    （去疑问词 + 拼接医疗领域词）扩召回。
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Dict, Iterator, List, Optional, Tuple

from services.llm_client import LLMClient, LLMNotConfigured, get_llm_client

logger = logging.getLogger(__name__)

# 单次问答注入的检索片段上限
DEFAULT_RETRIEVE_LIMIT = 6
# 带入上下文的历史消息上限（防止 token 膨胀）
MAX_HISTORY_MESSAGES = 10
# sources.excerpt / 降级摘要的单片段截断长度
EXCERPT_MAX_LEN = 200

# ---------------------------------------------------------------------------
# CRAG（Corrective RAG）重检索配置
# ---------------------------------------------------------------------------
def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


# CRAG 总检索轮次上限（含首轮），可用环境变量 CHAT_CRAG_MAX_ROUNDS 覆盖
CRAG_MAX_ROUNDS = max(1, _env_int("CHAT_CRAG_MAX_ROUNDS", 2))
# LLM grade 调用的 max_tokens（只输出小 JSON，调小省 token）
CRAG_GRADE_MAX_TOKENS = 150
# 启发式充分性：top1 score（hybrid_search 归一化后 0-100 量纲）阈值
CRAG_TOP1_SCORE_THRESHOLD = 30.0
# 启发式充分性：最少片段数（弱查询通常召回 <2 条，据此触发重检索）
CRAG_MIN_CHUNKS = 2
# 启发式 rewrite 时拼接的医疗领域词（扩大召回）
CRAG_REWRITE_DOMAIN_TERMS = "治疗 症状 诊断 用药"
# 启发式 rewrite 时剔除的疑问/语气词
CRAG_REWRITE_STOPWORDS = (
    "请问", "一下", "什么", "哪些", "怎么", "怎样", "如何",
    "吗", "呢", "的", "了", "？", "?",
)

SYSTEM_PROMPTS: Dict[str, str] = {
    "qa": (
        "你是一名严谨的医疗知识库问答助手，请遵守以下规则：\n"
        "1. 只能基于给定的资料片段回答问题，严禁使用资料之外的知识编造内容；\n"
        "2. 如果资料不足以回答问题，必须明确说明“根据现有资料无法确定”，不要强行作答；\n"
        "3. 回答中凡引用资料之处必须标注序号，格式为 [n]，n 与资料编号一一对应（如 [1]、[2]）；\n"
        "4. 回答末尾不需要列出参考资料列表（前端会单独渲染来源）；\n"
        "5. 全程使用中文回答。"
    ),
    "create": (
        "你是一名医疗文档创作助手，请遵守以下规则：\n"
        "1. 结合给定的检索资料，生成结构化的医疗文档草稿（含清晰的标题层级与段落）；\n"
        "2. 文档内容必须以资料为依据，引用资料之处标注序号 [n]（对应资料编号）；\n"
        "3. 资料不足的部分可以给出通用框架，但需注明“待补充资料佐证”；\n"
        "4. 全程使用中文输出。"
    ),
    "analyze": (
        "你是一名医疗数据分析助手，请遵守以下规则：\n"
        "1. 结合给定的检索资料，对问题进行多维度对比与归纳（如按病因/症状/治疗/预后等维度）；\n"
        "2. 输出结构化要点，优先使用分点列举，对比类问题可按维度组织；\n"
        "3. 结论必须以资料为依据，引用资料之处标注序号 [n]（对应资料编号）；\n"
        "4. 资料不足以支撑的结论需明确说明“根据现有资料无法确定”；\n"
        "5. 全程使用中文输出。"
    ),
}

_USER_CONTENT_PREFIX: Dict[str, str] = {
    "qa": "请基于上述资料回答问题（引用处标注 [n]）：",
    "create": "请结合上述资料完成文档创作：",
    "analyze": "请结合上述资料进行多维度对比与归纳分析：",
}


def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    """从 LLM 输出中提取首个 JSON 对象；失败返回 None。

    先整体 json.loads，失败后用正则截取第一个 {...} 片段再解析
    （容忍模型在 JSON 前后输出多余文本）。
    """
    if not text:
        return None
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except (TypeError, json.JSONDecodeError):
        pass
    match = re.search(r"\{.*\}", text, flags=re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        return data if isinstance(data, dict) else None
    except (TypeError, json.JSONDecodeError):
        return None


class ChatService:
    """RAG 问答编排服务：检索 -> 构造 prompt -> LLM 生成（含降级）。"""

    def __init__(self, search_service: Any, llm_client: Optional[LLMClient] = None) -> None:
        """
        Args:
            search_service: SearchService 实例（app.py 初始化后注入）
            llm_client: LLMClient 实例，默认取全局单例
        """
        self.search_service = search_service
        self.llm_client = llm_client or get_llm_client()

    # ------------------------------------------------------------------
    # 检索
    # ------------------------------------------------------------------
    def retrieve(
        self,
        message: str,
        kb_ids: Optional[List[str]],
        limit: int = DEFAULT_RETRIEVE_LIMIT,
    ) -> List[Dict[str, Any]]:
        """检索相关片段。

        kb_ids 为空 -> 全库检索；1 个 -> 单库检索；多个 -> 逐库检索后按
        score 合并取 top limit（hybrid_search 的 score 已归一化到 0-100，
        跨库可比）。folder_id 不过滤（None）。
        """
        cleaned = [str(k) for k in (kb_ids or []) if k and str(k).strip()]
        try:
            if len(cleaned) <= 1:
                return self.search_service.hybrid_search(
                    query=message,
                    kb_ids=cleaned or None,
                    mode="hybrid",
                    limit=limit,
                )

            merged: Dict[Tuple[str, Any], Dict[str, Any]] = {}
            for kb_id in cleaned:
                for result in self.search_service.hybrid_search(
                    query=message,
                    kb_ids=[kb_id],
                    mode="hybrid",
                    limit=limit,
                ):
                    key = (result.get("doc_id") or "", result.get("chunk_index", 0))
                    existing = merged.get(key)
                    if existing is None or result.get("score", 0.0) > existing.get("score", 0.0):
                        merged[key] = result
            return sorted(
                merged.values(), key=lambda r: r.get("score", 0.0), reverse=True
            )[:limit]
        except Exception as exc:
            logger.warning("[ChatService] retrieve failed: %s", exc)
            return []

    # ------------------------------------------------------------------
    # CRAG（Corrective RAG）重检索循环
    # ------------------------------------------------------------------
    def crag_retrieve(
        self,
        message: str,
        kb_ids: Optional[List[str]],
        limit: int = DEFAULT_RETRIEVE_LIMIT,
        max_rounds: int = CRAG_MAX_ROUNDS,
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """CRAG 重检索：retrieve -> grade -> (rewrite -> retrieve)* -> 合并去重。

        Returns:
            (chunks, retrieval_log)：chunks 为多轮合并去重后的最终片段
            （按 score 降序取 top limit）；retrieval_log 记录每轮
            {round, query, chunkCount, sufficient}，len>1 表示发生了重检索。
        """
        rounds = max(1, max_rounds)
        merged: Dict[Tuple[str, Any], Dict[str, Any]] = {}
        retrieval_log: List[Dict[str, Any]] = []
        query = message

        for round_no in range(1, rounds + 1):
            chunks = self.retrieve(query, kb_ids, limit=limit)
            # 最后一轮不再 grade（无剩余轮次可用，直接收尾）
            if round_no < rounds:
                sufficient, rewritten_query = self._grade_sufficiency(message, chunks)
            else:
                sufficient, rewritten_query = True, None
            retrieval_log.append(
                {
                    "round": round_no,
                    "query": query,
                    "chunkCount": len(chunks),
                    "sufficient": sufficient,
                }
            )
            # 合并去重：键 (doc_id, chunk_index)，同键保留高分
            for chunk in chunks:
                key = (chunk.get("doc_id") or "", chunk.get("chunk_index", 0))
                existing = merged.get(key)
                if existing is None or chunk.get("score", 0.0) > existing.get("score", 0.0):
                    merged[key] = chunk
            if sufficient:
                break
            # 不充分且有剩余轮次：改写 query 后重检索
            query = (rewritten_query or "").strip() or self._heuristic_rewrite(message)
            if not query:
                query = message
            logger.info(
                "[ChatService] CRAG round %d insufficient (chunks=%d), rewrite query: %s",
                round_no, len(chunks), query,
            )

        final_chunks = sorted(
            merged.values(), key=lambda r: r.get("score", 0.0), reverse=True
        )[:limit]
        return final_chunks, retrieval_log

    def _grade_sufficiency(
        self, message: str, chunks: List[Dict[str, Any]]
    ) -> Tuple[bool, Optional[str]]:
        """评估检索充分性，返回 (sufficient, rewritten_query)。

        LLM 已配置：调用模型输出 JSON {"sufficient": bool, "rewritten_query": str}；
        未配置/调用失败/输出不可解析：启发式（top1 score >= 30 且 chunks >= 2）。
        空结果直接判不充分，不浪费 LLM 调用，也保证该路径行为确定。
        """
        if not chunks:
            return False, None
        if self.llm_client is not None and getattr(self.llm_client, "is_configured", False):
            try:
                graded = self._grade_with_llm(message, chunks)
                if graded is not None:
                    return graded
            except Exception as exc:
                logger.warning("[ChatService] CRAG grade via LLM failed, heuristic fallback: %s", exc)
        return self._grade_heuristic(chunks), None

    def _grade_with_llm(
        self, message: str, chunks: List[Dict[str, Any]]
    ) -> Optional[Tuple[bool, Optional[str]]]:
        """LLM 充分性判定；输出不可解析时返回 None（调用方回退启发式）。"""
        summaries: List[str] = []
        for idx, chunk in enumerate(chunks[:5], start=1):
            text = (chunk.get("text") or "").strip().replace("\n", " ")[:120]
            summaries.append(f"[{idx}] {text}")
        context = "\n".join(summaries) if summaries else "（无检索结果）"
        prompt = (
            "请判断下列检索资料是否足以回答用户问题。\n"
            f"用户问题：{message}\n\n"
            f"检索资料摘要：\n{context}\n\n"
            '仅输出 JSON，不要输出其他内容：{"sufficient": true 或 false, '
            '"rewritten_query": "资料不充分时给出改写后的检索 query，充分时为空字符串"}'
        )
        text = self.llm_client.chat(
            [{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=CRAG_GRADE_MAX_TOKENS,
            response_format={"type": "json_object"},
        )
        data = _extract_json_object(text)
        if data is None or "sufficient" not in data:
            return None
        sufficient = bool(data.get("sufficient"))
        raw_rewrite = data.get("rewritten_query")
        rewritten = str(raw_rewrite).strip() if raw_rewrite is not None else ""
        return sufficient, (rewritten or None)

    @staticmethod
    def _grade_heuristic(chunks: List[Dict[str, Any]]) -> bool:
        """启发式充分性：top1 score >= 阈值 且 片段数 >= 下限。"""
        if len(chunks) < CRAG_MIN_CHUNKS:
            return False
        try:
            top1 = float(chunks[0].get("score", 0.0))
        except (TypeError, ValueError):
            top1 = 0.0
        return top1 >= CRAG_TOP1_SCORE_THRESHOLD

    @staticmethod
    def _heuristic_rewrite(message: str) -> str:
        """启发式 query 改写：去疑问/语气词 + 拼接医疗领域词，扩大召回。"""
        rewritten = message
        for word in CRAG_REWRITE_STOPWORDS:
            rewritten = rewritten.replace(word, " ")
        rewritten = " ".join(rewritten.split())
        return f"{rewritten} {CRAG_REWRITE_DOMAIN_TERMS}".strip()

    # ------------------------------------------------------------------
    # Prompt 构造
    # ------------------------------------------------------------------
    def build_messages(
        self,
        mode: str,
        message: str,
        history: Optional[List[Dict[str, Any]]],
        chunks: List[Dict[str, Any]],
    ) -> List[Dict[str, str]]:
        """按模式构造 OpenAI 风格 messages（system + 清洗后的 history + user）。"""
        system_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["qa"])
        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

        for item in (history or [])[-MAX_HISTORY_MESSAGES:]:
            if not isinstance(item, dict):
                continue
            role = item.get("role")
            content = item.get("content")
            if role not in {"user", "assistant"}:
                continue
            if not isinstance(content, str) or not content.strip():
                continue
            messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": self._build_user_content(mode, message, chunks)})
        return messages

    def _build_user_content(self, mode: str, message: str, chunks: List[Dict[str, Any]]) -> str:
        if chunks:
            parts = []
            for idx, chunk in enumerate(chunks, start=1):
                filename = chunk.get("filename") or "未知文档"
                chunk_index = chunk.get("chunk_index", 0)
                text = (chunk.get("text") or "").strip()
                parts.append(f"资料[{idx}]（来源：{filename} 第{chunk_index}段）\n{text}")
            context = "\n\n".join(parts)
        else:
            context = "（未检索到相关资料）"

        prefix = _USER_CONTENT_PREFIX.get(mode, _USER_CONTENT_PREFIX["qa"])
        return f"以下是从知识库检索到的资料：\n\n{context}\n\n{prefix}\n{message}"

    # ------------------------------------------------------------------
    # 非流式问答
    # ------------------------------------------------------------------
    def answer(
        self,
        mode: str,
        message: str,
        history: Optional[List[Dict[str, Any]]],
        kb_ids: Optional[List[str]],
    ) -> Dict[str, Any]:
        """非流式问答，返回 {"answer": str, "sources": [...]}，永不抛 LLM 异常。"""
        chunks, _retrieval_log = self.crag_retrieve(message, kb_ids)
        sources = self.build_sources(chunks)
        messages = self.build_messages(mode, message, history, chunks)

        try:
            text = self.llm_client.chat(messages)
            if not text or not text.strip():
                text = self._fallback_answer(chunks)
        except LLMNotConfigured:
            text = self._fallback_answer(chunks)
        except Exception as exc:
            logger.warning("[ChatService] chat failed, fallback: %s", exc)
            text = self._fallback_answer(chunks, reason="LLM 调用失败")

        return {"answer": text, "sources": sources}

    # ------------------------------------------------------------------
    # 流式问答
    # ------------------------------------------------------------------
    def answer_stream(
        self,
        mode: str,
        message: str,
        history: Optional[List[Dict[str, Any]]],
        kb_ids: Optional[List[str]],
    ) -> Tuple[List[Dict[str, Any]], Iterator[str], Dict[str, Any]]:
        """流式问答。

        Returns:
            (sources, token_iter, retrieval_meta)：
            sources 供 SSE sources 事件下发（最终合并去重后的检索结果）；
            token_iter 为同步生成器，逐块产出文本；降级路径一次性 yield 完整文本；
            retrieval_meta = {"rewritten": bool, "rounds": int, "log": [...]}，
            rewritten=True 表示 CRAG 发生了重检索（app 层据此在 sources 事件
            之前补发 {"type": "status", "message": "正在优化检索…"}——前端契约：
            未知事件类型会被安全忽略，旧前端不受影响）。
        """
        chunks, retrieval_log = self.crag_retrieve(message, kb_ids)
        sources = self.build_sources(chunks)
        messages = self.build_messages(mode, message, history, chunks)
        retrieval_meta = {
            "rewritten": len(retrieval_log) > 1,
            "rounds": len(retrieval_log),
            "log": retrieval_log,
        }
        return sources, self._token_iterator(messages, chunks), retrieval_meta

    def _token_iterator(
        self,
        messages: List[Dict[str, str]],
        chunks: List[Dict[str, Any]],
    ) -> Iterator[str]:
        """同步 token 生成器：优先 LLM 流式，未配置/异常时走降级。"""
        produced = False
        try:
            for token in self.llm_client.chat_stream(messages):
                produced = True
                yield token
            if not produced:
                # 模型返回空内容，按降级处理保证前端有响应
                yield self._fallback_answer(chunks)
        except LLMNotConfigured:
            yield self._fallback_answer(chunks)
        except Exception as exc:
            logger.warning("[ChatService] chat_stream failed: %s", exc)
            if produced:
                yield "\n\n（流式生成中断，请重试）"
            else:
                yield self._fallback_answer(chunks, reason="LLM 调用失败")

    # ------------------------------------------------------------------
    # sources / 降级文本
    # ------------------------------------------------------------------
    @staticmethod
    def build_sources(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """从检索片段提取前端 sources 契约。

        hybrid_search 的 score 为 0-100 量纲，前端契约（及全站 confidence
        惯例）为 0~1，此处统一除 100 归一化并 clamp 到 [0, 1]，保留 3 位小数。
        """
        sources: List[Dict[str, Any]] = []
        for chunk in chunks or []:
            doc_id = str(chunk.get("doc_id") or "")
            if doc_id.startswith("doc-"):
                doc_id = doc_id[len("doc-"):]
            text = (chunk.get("text") or "").strip()
            try:
                score = max(0.0, min(1.0, round(float(chunk.get("score", 0.0)) / 100.0, 3)))
            except (TypeError, ValueError):
                score = 0.0
            sources.append(
                {
                    "docId": doc_id,
                    "filename": chunk.get("filename") or "Unknown",
                    "chunkIndex": chunk.get("chunk_index", 0),
                    "score": score,
                    "excerpt": text[:EXCERPT_MAX_LEN],
                }
            )
        return sources

    @staticmethod
    def _fallback_answer(chunks: List[Dict[str, Any]], reason: str = "LLM 未配置") -> str:
        """降级文本：检索片段摘要拼接（标注来源），保证前端永远有可用响应。"""
        if not chunks:
            return (
                f"{reason}，且未检索到相关资料片段。"
                "请检查知识库内容，或配置 LLM_API_KEY 后重试。"
            )
        parts = [f"{reason}，以下是检索到的相关资料片段："]
        for idx, chunk in enumerate(chunks, start=1):
            filename = chunk.get("filename") or "未知文档"
            chunk_index = chunk.get("chunk_index", 0)
            excerpt = (chunk.get("text") or "").strip().replace("\n", " ")[:EXCERPT_MAX_LEN]
            parts.append(f"[{idx}]（来源：{filename} 第{chunk_index}段）{excerpt}")
        return "\n\n".join(parts)


__all__ = ["ChatService", "SYSTEM_PROMPTS", "DEFAULT_RETRIEVE_LIMIT"]
