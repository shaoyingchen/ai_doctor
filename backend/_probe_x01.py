from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

lines = [
    line.strip()
    for line in Path("verify_pdf.log").read_text(encoding="utf-8-sig", errors="replace").splitlines()
    if line.strip().startswith("{")
]
data = json.loads(lines[-1])
text = "\n".join(c.get("content") or "" for c in data["parse"]["chunks"])

ctx = Counter()
for m in re.finditer("\x01", text):
    prev = text[m.start() - 1] if m.start() > 0 else ""
    nxt = text[m.start() + 1] if m.start() + 1 < len(text) else ""
    prev_kind = "CJK" if prev and 0x4E00 <= ord(prev) <= 0x9FFF else ("NL" if prev == "\n" else "OTHER")
    next_kind = "CJK" if nxt and 0x4E00 <= ord(nxt) <= 0x9FFF else ("NL" if nxt == "\n" else "OTHER")
    ctx[(prev_kind, next_kind)] += 1

print("x01_neighbor_kinds:", dict(ctx))
print("--- samples (prev|next raw) ---")
shown = 0
for m in re.finditer("\x01", text):
    s = max(0, m.start() - 12)
    e = min(len(text), m.start() + 13)
    print(repr(text[s:e]))
    shown += 1
    if shown >= 10:
        break
