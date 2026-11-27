from __future__ import annotations

import json
import re
import sys
import unicodedata
from collections import Counter
from pathlib import Path

log_path = Path(sys.argv[1])
lines = [
    line.strip()
    for line in log_path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    if line.strip().startswith("{")
]
data = json.loads(lines[-1])
chunks = data["parse"]["chunks"]
text = "\n".join(c.get("content") or "" for c in chunks)

ctrl = Counter(ch for ch in text if ord(ch) < 32 and ch not in "\n\r\t")
print("control_chars:", {hex(ord(k)): v for k, v in ctrl.items()})

# 康熙部首 / CJK 兼容字符
radicals = Counter(ch for ch in text if 0x2E80 <= ord(ch) <= 0x2FDF)
print("kangxi_radicals_total:", sum(radicals.values()))
print("kangxi_top:", [(ch, n) for ch, n in radicals.most_common(8)])

compat = Counter(ch for ch in text if 0xF900 <= ord(ch) <= 0xFAFF)
print("cjk_compat_total:", sum(compat.values()))

# 私有区/替换符/零宽
private = Counter(ch for ch in text if 0xE000 <= ord(ch) <= 0xF8FF)
print("private_use:", sum(private.values()))
print("replacement_u+fffd:", text.count("\ufffd"))
print("total_chars:", len(text))

# 典型词是否可正常匹配
for word in ("大模型", "用好", "人工智能"):
    print(f"contains_normal[{word}]:", word in text)

# 试规范化后是否可匹配
norm = unicodedata.normalize("NFKC", text)
for word in ("大模型", "用好", "人工智能"):
    print(f"contains_nfkc[{word}]:", word in norm)
