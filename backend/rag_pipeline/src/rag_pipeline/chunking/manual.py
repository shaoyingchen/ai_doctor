from __future__ import annotations

from rag_pipeline.chunking.general import build_chunks_from_blocks


class ManualChunkBuilder:
    """手册类文档分块：先按 section_path 分组，再在组内按字符窗口切分。

    section_path 由 build_section_paths 依据标题层级生成，因此每个 chunk
    不会跨越章节边界，title 直接取章节末级标题，便于检索结果溯源。
    """

    def build(self, *, doc_id: str, filename: str, blocks: list[dict]) -> list[dict]:
        groups: list[tuple[tuple[str, ...], list[dict]]] = []
        current_key: tuple[str, ...] = ()
        current_blocks: list[dict] = []

        for block in blocks:
            key = tuple(str(item) for item in (block.get("section_path") or []))
            if key != current_key and current_blocks:
                groups.append((current_key, current_blocks))
                current_blocks = []
            current_key = key
            current_blocks.append(block)
        if current_blocks:
            groups.append((current_key, current_blocks))

        chunks: list[dict] = []
        next_index = 1
        for section_path, group_blocks in groups:
            group_chunks = build_chunks_from_blocks(
                doc_id=doc_id,
                filename=filename,
                blocks=group_blocks,
                chunk_type="section",
                title=section_path[-1] if section_path else None,
                start_index=next_index,
            )
            chunks.extend(group_chunks)
            next_index += len(group_chunks)
        return chunks
