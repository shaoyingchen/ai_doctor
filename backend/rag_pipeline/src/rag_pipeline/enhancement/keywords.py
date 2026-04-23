from __future__ import annotations

import re


_WORD_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9_\-]{1,30}|[\u4e00-\u9fff]{2,10}")
_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "this",
    "that",
    "from",
    "have",
    "will",
    "into",
}


def extract_keywords(chunks: list[dict]) -> list[dict]:
    """Extract stable top keywords by frequency."""
    rows: list[dict] = []
    for chunk in chunks:
        text = chunk.get("content", "") or ""
        words = [token.lower() for token in _WORD_PATTERN.findall(text)]
        freq: dict[str, int] = {}
        for word in words:
            if len(word) < 2 or word in _STOPWORDS:
                continue
            freq[word] = freq.get(word, 0) + 1
        ranked = sorted(freq.items(), key=lambda item: (-item[1], item[0]))
        rows.append({"chunk_id": chunk["chunk_id"], "keywords": [word for word, _ in ranked[:5]]})
    return rows
