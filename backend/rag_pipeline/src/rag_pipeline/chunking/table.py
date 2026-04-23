from __future__ import annotations

from rag_pipeline.utils.ids import new_id


class TableChunkBuilder:
    """Build table chunks with a simple sheet-level strategy."""

    def build(self, *, doc_id: str, filename: str, blocks: list[dict]) -> list[dict]:
        by_page: dict[int, list[dict]] = {}
        for block in blocks:
            page_no = block.get("page_no") or 1
            by_page.setdefault(page_no, []).append(block)

        chunks: list[dict] = []
        for page_no in sorted(by_page):
            page_blocks = by_page[page_no]
            content = "\n".join(block["text"] for block in page_blocks if block.get("text")).strip()
            if not content:
                continue
            chunks.append(
                {
                    "chunk_id": new_id("chk"),
                    "doc_id": doc_id,
                    "chunk_type": "table",
                    "title": f"{filename} - table {page_no}",
                    "content": content,
                    "content_with_context": content,
                    "page_span": [page_no],
                    "section_path": [],
                    "bbox_refs": [block["block_id"] for block in page_blocks],
                    "table_refs": [f"tbl_{page_no}"],
                    "image_refs": [],
                    "source_engine": page_blocks[0]["source_engine"] if page_blocks else "",
                    "metadata": {"table_scope": "sheet"},
                }
            )
        return chunks

