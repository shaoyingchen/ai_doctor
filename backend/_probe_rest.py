from __future__ import annotations

import json
import sys
import unicodedata
from collections import Counter
from pathlib import Path

path = Path(sys.argv[1])
lines = [
    line.strip()
    for line in path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    if line.strip().startswith("{")
]
data = json.loads(lines[-1])
text = "\n".join(c.get("content") or "" for c in data["parse"]["chunks"])

remaining = Counter(ch for ch in text if 0x2E80 <= ord(ch) <= 0x2FDF or 0xF900 <= ord(ch) <= 0xFAFF)
print("remaining_radicals:", [(ch, hex(ord(ch)), n, unicodedata.name(ch, "?")) for ch, n in remaining.most_common()])
print("nfkc_of_remaining:", [(ch, unicodedata.normalize("NFKC", ch)) for ch, _ in remaining.most_common()])

print("--- search 人工 variants ---")
import re
for m in re.finditer("人工", text):
    print(repr(text[m.start() - 6 : m.start() + 10]))
print("--- chars with space-neighbor around 智能 ---")
for m in re.finditer("智能", text):
    print(repr(text[max(0, m.start() - 8) : m.start() + 8]))
