from __future__ import annotations

from rag_pipeline.utils.ids import new_id


class PresentationChunkBuilder:
    def build(self, *, doc_id: str, filename: str, blocks: list[dict]) -> list[dict]:
        by_page: dict[int, list[dict]] = {}
        for block in blocks:
            page_no = block.get("page_no") or 1
            by_page.setdefault(page_no, []).append(block)

        chunks: list[dict] = []
        for page_no, page_blocks in by_page.items():
            content = "\n".join(block["text"] for block in page_blocks if block.get("text"))
            chunks.append(
                {
                    "chunk_id": new_id("chk"),
                    "doc_id": doc_id,
                    "chunk_type": "slide",
                    "title": f"{filename} - slide {page_no}",
                    "content": content,
                    "content_with_context": content,
                    "page_span": [page_no],
                    "section_path": [],
                    "bbox_refs": [block["block_id"] for block in page_blocks],
                    "table_refs": [],
                    "image_refs": [],
                    "source_engine": page_blocks[0]["source_engine"] if page_blocks else "",
                    "metadata": {},
                }
            )
        return chunks

