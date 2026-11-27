from __future__ import annotations

import re
import unicodedata
from io import BytesIO

from rag_pipeline.parsers.base import ParseResult

MAX_PAGE_CHARS = 1800

# C0 控制符，保留 \n(0x0a) \t(0x09) \f(0x0c)：\f 承载分页信息，须留到分页之后。
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0e-\x1f\x7f]")

# CJK 部首补充区（U+2E80–U+2EFF）中的简体部首没有 NFKC 分解，需显式映射。
# 仅收录实测 PDF 中出现的字符，遇到新字符按同样方式补充。
_CJK_RADICAL_MAP = str.maketrans(
    {
        "\u2ed3": "长",  # ⻓ CJK RADICAL C-SIMPLIFIED LONG
        "\u2ec5": "见",  # ⻅ CJK RADICAL C-SIMPLIFIED SEE
        "\u2edc": "飞",  # ⻜ CJK RADICAL C-SIMPLIFIED FLY
        "\u2ee3": "骨",  # ⻣ CJK RADICAL BONE
        "\u2ed4": "门",  # ⻔ CJK RADICAL C-SIMPLIFIED GATE
        "\u2edb": "风",  # ⻛ CJK RADICAL C-SIMPLIFIED WIND
    }
)


def _normalize_extracted_text(text: str) -> str:
    """归一化 PDF 抽取出的文本。

    1. 康熙部首 / CJK 兼容表意文字（U+2F00–U+2FDF、U+F900–U+FAFF）按 NFKC 映射回
       通用汉字；CJK 部首补充区（U+2E80–U+2EFF）无 NFKC 分解，走 _CJK_RADICAL_MAP。
       PDF 常把「一」「大」「用」「长」等常用字输出成兼容部首字符，不归一化时
       「大模型」「用好」「擅长」这类正常词无法被检索命中。
       只对上述兼容区做 NFKC，避免全局 NFKC 把中文全角标点（，：（））压成 ASCII。
    2. C0 控制符替换为空格。示例 PDF 用 \\x01 作中英混排分隔符，残留会把中文词切断；
       替换成空格而非删除，避免把 "ai" 和 "coding" 粘成 "aicoding"。
    """
    converted = [
        unicodedata.normalize("NFKC", char)
        if 0x2F00 <= ord(char) <= 0x2FDF or 0xF900 <= ord(char) <= 0xFAFF
        else char
        for char in text
    ]
    normalized = "".join(converted).translate(_CJK_RADICAL_MAP)
    return _CONTROL_CHARS.sub(" ", normalized)


def _decode_text(data: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "gb18030"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="ignore")


def _extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text from simple text-based PDFs with best-effort fallbacks."""
    try:
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(BytesIO(file_bytes))
        pages: list[str] = []
        for page in reader.pages:
            text = (page.extract_text() or "").strip()
            if text:
                pages.append(text)
        if pages:
            return "\f".join(pages)
    except Exception:
        pass

    decoded = file_bytes.decode("latin-1", errors="ignore")
    literal_chunks = re.findall(r"\((.*?)\)\s*Tj", decoded, flags=re.DOTALL)
    if literal_chunks:
        return "\n".join(chunk.replace("\\n", "\n").replace("\\r", "\n").strip() for chunk in literal_chunks)
    return ""


class PlaintextPdfParser:
    def parse(self, *, file_bytes: bytes, filename: str, metadata: dict) -> ParseResult:
        ext = metadata.get("ext", "")
        if ext == ".pdf":
            decoded = _extract_pdf_text(file_bytes)
            decoded = _normalize_extracted_text(decoded)
            if not decoded.strip():
                decoded = _normalize_extracted_text(_decode_text(file_bytes))
        else:
            decoded = _decode_text(file_bytes)

        decoded = decoded.replace("\r\n", "\n")
        decoded = decoded.replace("\r", "\n").strip()

        if not decoded:
            # Phase 1 keeps a deterministic fallback and avoids external OCR dependency.
            decoded = f"stub text from {filename}" if ext == ".pdf" else ""

        page_texts: list[str]
        if "\f" in decoded:
            page_texts = [page.strip() for page in decoded.split("\f") if page.strip()]
        else:
            page_texts = [decoded[i : i + MAX_PAGE_CHARS].strip() for i in range(0, len(decoded), MAX_PAGE_CHARS)]
            page_texts = [page for page in page_texts if page]

        if not page_texts:
            page_texts = [f"empty content from {filename}"]

        pages: list[dict] = []
        all_blocks: list[dict] = []
        for page_index, page_text in enumerate(page_texts, start=1):
            lines = [line.strip() for line in page_text.split("\n") if line.strip()]
            if not lines:
                lines = [page_text]

            blocks = [
                {
                    "type": "text",
                    "text": line,
                    "bbox": None,
                    "order": order_index,
                }
                for order_index, line in enumerate(lines, start=1)
            ]
            pages.append({"page_no": page_index, "blocks": blocks})
            all_blocks.extend(blocks)

        return ParseResult(raw_pages=pages, raw_blocks=all_blocks, tables=[], figures=[])
