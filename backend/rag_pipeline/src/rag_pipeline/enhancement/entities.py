from __future__ import annotations

import re


_TOKEN_PATTERN = re.compile(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}|[A-Za-z][A-Za-z0-9_\-]{1,30}|[\u4e00-\u9fff]{2,10}")
_DATE_PATTERN = re.compile(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}$")
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
    "table",
    "slide",
}


def _entity_type(token: str) -> str:
    if _DATE_PATTERN.match(token):
        return "date"
    if token.isupper() and len(token) >= 2:
        return "acronym"
    if token.endswith(("公司", "集团", "系统", "平台", "中心")):
        return "organization"
    return "term"


def extract_entities(chunks: list[dict]) -> list[dict]:
    """Extract deterministic entity nodes from chunk content."""
    entities: list[dict] = []
    for chunk in chunks:
        text = chunk.get("content", "") or ""
        seen: set[str] = set()
        tokens = _TOKEN_PATTERN.findall(text)
        selected = [
            token
            for token in tokens
            if token.lower() not in _STOPWORDS and len(token) >= 2 and not (token in seen or seen.add(token))
        ]
        for token in selected[:5]:
            entity_type = _entity_type(token)
            entities.append(
                {
                    "entity_id": f'ent_{chunk["chunk_id"]}_{token[:8]}',
                    "text": token,
                    "type": entity_type,
                    "confidence": 0.72 if entity_type != "term" else 0.65,
                    "metadata": {"chunk_id": chunk["chunk_id"], "source": "rule_based"},
                }
            )
    return entities
