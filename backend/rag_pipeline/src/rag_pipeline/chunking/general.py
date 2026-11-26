from __future__ import annotations

from rag_pipeline.utils.ids import new_id

# 分块参数：按字符数近似控制窗口大小，overlap 为相邻窗口的重叠字符数。
# 取值与旧链路 app.py 的 DEFAULT_CHUNK_SIZE/OVERLAP 保持同一量级，
# 便于两套链路写入的 chunk 粒度一致。
DEFAULT_CHUNK_SIZE = 900
DEFAULT_CHUNK_OVERLAP = 120
# 相邻窗口的重叠以「上一窗口最后一个 block」为单位携带，block 过长时不再携带，
# 避免单个 block 反复占据整个重叠预算。
MAX_OVERLAP_BLOCK_CHARS = 400


def _split_long_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """把超长文本按字符窗口切开，窗口之间保留 overlap 个字符的上下文。"""
    if len(text) <= chunk_size:
        return [text]

    overlap = max(0, min(overlap, chunk_size // 2))
    step = max(1, chunk_size - overlap)
    pieces: list[str] = []
    for start in range(0, len(text), step):
        piece = text[start : start + chunk_size].strip()
        if piece:
            pieces.append(piece)
        if start + chunk_size >= len(text):
            break
    return pieces


def build_chunks_from_blocks(
    *,
    doc_id: str,
    filename: str,
    blocks: list[dict],
    chunk_type: str = "section",
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
    title: str | None = None,
    table_refs: list[str] | None = None,
    start_index: int = 1,
    metadata: dict | None = None,
) -> list[dict]:
    """把 normalized blocks 按字符窗口聚合成多个 chunk。

    聚合规则：
    - 跳过空文本 block；
    - 顺序累积 block，累计字符数达到 chunk_size 即切窗；
    - 下一窗口以上一窗口最后一个 block 作为重叠上下文（block 过长时不携带）；
    - 单个 block 超过 chunk_size 时单独按字符窗口切分。

    每个 chunk 带 chunk_index（全局唯一，用作 Qdrant point id 与 chunks 表
    的 chunk_index），section_path 取自窗口内最后一个 block，title 取章节末级标题。
    """
    chunks: list[dict] = []
    index = start_index

    def emit(window: list[dict], block_texts: list[str]) -> None:
        nonlocal index
        if not window:
            return
        content = "\n".join(block_texts).strip()
        if not content:
            return

        section_path: list[str] = []
        for block in reversed(window):
            path = block.get("section_path") or []
            if path:
                section_path = [str(item) for item in path]
                break

        page_span = sorted(
            {block["page_no"] for block in window if block.get("page_no") is not None}
        )
        chunk_title = title or (section_path[-1] if section_path else filename)
        content_with_context = (
            " > ".join(section_path) + "\n" + content if section_path else content
        )
        chunks.append(
            {
                "chunk_id": new_id("chk"),
                "doc_id": doc_id,
                "chunk_index": index,
                "chunk_type": chunk_type,
                "title": chunk_title,
                "content": content,
                "content_with_context": content_with_context,
                "char_count": len(content),
                "page_span": page_span,
                "section_path": section_path,
                "bbox_refs": [block["block_id"] for block in window if block.get("block_id")],
                "table_refs": list(table_refs or []),
                "image_refs": [],
                "source_engine": window[0].get("source_engine", ""),
                "metadata": dict(metadata or {}),
            }
        )
        index += 1

    window: list[dict] = []
    window_texts: list[str] = []
    window_chars = 0

    for block in blocks:
        text = str(block.get("text") or "").strip()
        if not text:
            continue

        if len(text) > chunk_size:
            # 超长 block：先结算当前窗口，再对 block 自身切窗
            emit(window, window_texts)
            window, window_texts, window_chars = [], [], 0
            for piece in _split_long_text(text, chunk_size, overlap):
                emit([block], [piece])
            continue

        window.append(block)
        window_texts.append(text)
        window_chars += len(text) + 1

        if window_chars >= chunk_size:
            emit(window, window_texts)
            last_block = window[-1]
            last_text = window_texts[-1]
            # 以上一窗口末尾 block 作为重叠上下文；过长则不携带，避免窗口无法推进
            if overlap > 0 and len(last_text) <= MAX_OVERLAP_BLOCK_CHARS:
                window, window_texts = [last_block], [last_text]
                window_chars = len(last_text) + 1
            else:
                window, window_texts, window_chars = [], [], 0

    emit(window, window_texts)
    return chunks


class GeneralChunkBuilder:
    def build(self, *, doc_id: str, filename: str, blocks: list[dict]) -> list[dict]:
        return build_chunks_from_blocks(
            doc_id=doc_id,
            filename=filename,
            blocks=blocks,
            chunk_type="section",
        )
