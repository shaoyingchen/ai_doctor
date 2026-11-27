from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

path = Path(sys.argv[1])
lines = [
    line.strip()
    for line in path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    if line.strip().startswith("{")
]
data = json.loads(lines[-1])
parse = data["parse"]
enhance = data["enhance"]
chunks = parse["chunks"]
text = "\n".join(c.get("content") or "" for c in chunks)

print("parser_engine:", parse.get("parser_engine"))
print("parse_quality_score:", parse.get("parse_quality_score"))
print("requires_review:", parse.get("requires_review"))
print("blocks:", len(parse["normalized_blocks"]))
print("chunks:", len(chunks))
print("embeddings:", len(enhance.get("embeddings") or []))
print("dims:", sorted({len(r["vector"]) for r in (enhance.get("embeddings") or [])}))
print("chunk_index:", [c.get("chunk_index") for c in chunks][:12])
print("char_count:", [c.get("char_count") for c in chunks][:12])
print("page_spans:", [c.get("page_span") for c in chunks][:6])
print("errors:", parse.get("errors"), enhance.get("errors"))

ctrl = Counter(ch for ch in text if ord(ch) < 32 and ch not in "\n\r\t")
radicals = sum(1 for ch in text if 0x2E80 <= ord(ch) <= 0x2FDF)
print("--- pollution ---")
print("control_chars:", {hex(ord(k)): v for k, v in ctrl.items()})
print("kangxi_radicals:", radicals)
print("u+fffd:", text.count("\ufffd"))

print("--- keyword retrieval ---")
for word in ("大模型", "用好", "人工智能", "专家系统", "图灵测试", "神经网络", "注意力机制"):
    print(f"  {word}: {word in text}")

print("--- punctuation preserved (fullwidth) ---")
print("fullwidth_comma:", text.count("，"), "ascii_comma:", text.count(","))
print("fullwidth_colon:", text.count("："), "ascii_colon:", text.count(":"))

print("--- samples ---")
for c in chunks[:3]:
    print("[", c.get("chunk_index"), "]", repr((c.get("content") or "")[:150]))
