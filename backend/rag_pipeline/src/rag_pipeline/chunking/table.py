from __future__ import annotations

from rag_pipeline.chunking.general import build_chunks_from_blocks


class TableChunkBuilder:
    """表格类文档分块：按页(sheet)分组，组内再按字符窗口切行窗口。

    表头语义目前无法从 normalized blocks 恢复（解析阶段已拍平为文本行），
    因此仅保留 sheet 级 title 与 table_refs，检索依赖行文本本身。
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
                chunk_type="table",
                title=f"{filename} - table {page_no}",
                table_refs=[f"tbl_{page_no}"],
                metadata={"table_scope": "sheet", "page_no": page_no},
                start_index=next_index,
            )
            chunks.extend(page_chunks)
            next_index += len(page_chunks)
        return chunks
