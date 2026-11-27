from __future__ import annotations

import json
import sys
from pathlib import Path

log_path = Path(sys.argv[1])
lines = [
    line.strip()
    for line in log_path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    if line.strip().startswith("{")
]
data = json.loads(lines[-1])
parse = data["parse"]
enhance = data["enhance"]
chunks = parse["chunks"]
embeddings = enhance.get("embeddings") or []

print("parser_engine:", parse.get("parser_engine"))
print("doc_strategy:", parse.get("doc_strategy"))
print("parse_quality_score:", parse.get("parse_quality_score"))
print("requires_review:", parse.get("requires_review"))
print("quality_metrics:", json.dumps(parse.get("quality_metrics"), ensure_ascii=False))
print("normalized_blocks:", len(parse["normalized_blocks"]))
print("chunks:", len(chunks))
print("embeddings:", len(embeddings))
print("dims:", sorted({len(r["vector"]) for r in embeddings}))
print("chunk_index_head:", [c.get("chunk_index") for c in chunks][:10])
print("char_count_head:", [c.get("char_count") for c in chunks][:10])
print("page_span_head:", [c.get("page_span") for c in chunks][:6])
print("max_char:", max((c.get("char_count") or 0) for c in chunks) if chunks else 0)
print("errors:", parse.get("errors"), enhance.get("errors"))
print("--- first 3 chunk texts ---")
for c in chunks[:3]:
    print("[", c.get("chunk_index"), "]", repr((c.get("content") or "")[:180]))
