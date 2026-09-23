from __future__ import annotations

import sys
from pathlib import Path

# rag_pipeline 以 src 布局被 app.py 引入（sys.path 指向 src/），
# 这里兜底把 backend/ 加入 sys.path 以便 import services.embedding_service；
# 独立运行 rag_pipeline（不经过 app.py）时同样可用。
_BACKEND_DIR = Path(__file__).resolve().parents[4]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

try:
    from services.embedding_service import get_embedding_service
except ImportError:  # pragma: no cover - backend/services 不可用时的兜底
    get_embedding_service = None


def embed_texts(rows: list[dict]) -> list[dict]:
    """为每个 chunk 生成向量，保持 {chunk_id, vector, dim, model} 输出结构。

    统一走 services.embedding_service（OpenAI 兼容协议）；未配置 key 或
    API 异常时其内部降级为确定性 hash 假向量，不中断流水线。
    """
    if not rows:
        return []

    if get_embedding_service is None:
        # 极端兜底：embedding_service 无法 import 时返回零向量，保证图可执行
        return [
            {"chunk_id": row["chunk_id"], "vector": [0.0], "dim": 1, "model": "unavailable"}
            for row in rows
        ]

    service = get_embedding_service()
    texts = [row.get("embedding_text", "") for row in rows]
    vectors = service.embed_texts(texts)
    model = service.model if service.is_configured else "fake-hash-fallback"
    return [
        {
            "chunk_id": row["chunk_id"],
            "vector": vector,
            "dim": len(vector),
            "model": model,
        }
        for row, vector in zip(rows, vectors)
    ]
