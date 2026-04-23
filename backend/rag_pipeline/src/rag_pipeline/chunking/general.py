from __future__ import annotations

from rag_pipeline.utils.ids import new_id


class GeneralChunkBuilder:
    def build(self, *, doc_id: str, filename: str, blocks: list[dict]) -> list[dict]:
        content = "\n".join(block["text"] for block in blocks if block.get("text"))
        return [
            {
                "chunk_id": new_id("chk"),
                "doc_id": doc_id,
                "chunk_type": "section",
                "title": filename,
                "content": content,
                "content_with_context": content,
                "page_span": sorted({block["page_no"] for block in blocks if block.get("page_no") is not None}),
                "section_path": [],
                "bbox_refs": [block["block_id"] for block in blocks],
                "table_refs": [],
                "image_refs": [],
                "source_engine": blocks[0]["source_engine"] if blocks else "",
                "metadata": {},
            }
        ]

