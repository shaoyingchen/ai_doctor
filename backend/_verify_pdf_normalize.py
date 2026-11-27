from __future__ import annotations

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent / "rag_pipeline" / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from rag_pipeline.parsers.pdf.plaintext_pdf_parser import (  # noqa: E402
    _normalize_extracted_text,
)


def check(name: str, cond: bool, detail: str) -> None:
    print(("PASS " if cond else "FAIL ") + name + " | " + detail)
    if not cond:
        raise SystemExit(1)


# 1) 康熙部首（U+2F00–U+2FDF）经 NFKC 还原为通用汉字
raw = "理解⼤模型，⽤好ai"
out = _normalize_extracted_text(raw)
check("kangxi.to_normal", out == "理解大模型，用好ai", repr(out))

# 2) CJK 部首补充区（U+2E80–U+2EFF）走显式映射表
raw2 = "它更擅⻓“选择题”，⻅到⻛险"
out2 = _normalize_extracted_text(raw2)
check("radical_supp.map", out2 == "它更擅长“选择题”，见到风险", repr(out2))

# 3) C0 控制符替换为空格，不粘连英文单词
out3 = _normalize_extracted_text("ai\x01coding\x01\n一")
check("control.to_space", out3 == "ai coding \n一", repr(out3))

# 4) 保留 \n / \t / \f（分页信息不能丢）
out4 = _normalize_extracted_text("第一页\f第二页\n\t缩进")
check("keep_linebreak_page", out4 == "第一页\f第二页\n\t缩进", repr(out4))

# 5) 全角标点不被 NFKC 压成 ASCII
out5 = _normalize_extracted_text("注意：不要使用（）和，")
check("fullwidth_punct_kept", out5 == "注意：不要使用（）和，", repr(out5))

# 6) 已是通用汉字的文本保持不变（幂等）
out6 = _normalize_extracted_text("大模型训练")
check("idempotent", out6 == "大模型训练" and _normalize_extracted_text(out6) == out6, repr(out6))

# 7) 空串安全
check("empty", _normalize_extracted_text("") == "", "empty -> empty")

print("ALL PDF NORMALIZE CHECKS PASSED")
