from __future__ import annotations

from rag_pipeline.chunking.general import build_chunks_from_blocks


class PresentationChunkBuilder:
    """演示文稿分块：按页(slide)分组，组内再按字符窗口切分。

    单页内容通常远小于一个窗口，因此实际等价于「一页一 chunk」，
    仅在页面文本超长时才会继续切分。
    """

    def build(self, *, doc_id: str, filename: str, blocks: list[dict]) -> list[dict]:
        by_page: dict[int, list[dict]] = {}
        for block in blocks:
            page_no = block.get("page_no") or 1
            by_page.setdefault(page_no, []).append(block)

        chunks: list[dict] = []
        next_index = 1
        for page_no in sorted(by_page):
            page_chunks = build_chunks_from_blocks(
                doc_id=doc_id,
                filename=filename,
                blocks=by_page[page_no],
                chunk_type="slide",
                title=f"{filename} - slide {page_no}",
                metadata={"page_no": page_no},
                start_index=next_index,
            )
            chunks.extend(page_chunks)
            next_index += len(page_chunks)
        return chunks
