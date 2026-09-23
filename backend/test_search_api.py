"""
Test script for hybrid search API
"""

import json
import sqlite3
from pathlib import Path
from uuid import uuid4

from services.search_service import SearchService
from services.vector_service import QdrantVectorStore

# Setup paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SQLITE_PATH = DATA_DIR / "app.db"

# Initialize services
db = sqlite3.connect(SQLITE_PATH, check_same_thread=False)
db.row_factory = sqlite3.Row

# vector_size 默认跟随 EMBEDDING_DIM（无 key 时 embedding_service 降级确定性假向量）
vector_service = QdrantVectorStore(
    collection_name="knowledge_base",
    storage_path=str(DATA_DIR / "qdrant"),
)

search_service = SearchService(db=db, vector_service=vector_service)

# Insert test data
print("Setting up test data...")

# Create test document
test_doc_id = str(uuid4())
test_kb_id = "kb-1"

db.execute(
    """
    INSERT OR REPLACE INTO documents (
        id, filename, knowledge_base_id, folder_id, content_type,
        size, status, progress, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    """,
    (test_doc_id, "test_document.txt", test_kb_id, None, "text/plain", 1000, "completed", 100)
)

# Insert test chunks
test_chunks = [
    {
        "text": "人工智能技术在医疗领域的应用越来越广泛，包括疾病诊断、药物研发和患者管理等方面。",
        "chunk_index": 1,
    },
    {
        "text": "机器学习算法可以帮助医生更准确地诊断疾病，提高诊疗效率。深度学习在医学影像分析中表现出色。",
        "chunk_index": 2,
    },
    {
        "text": "知识图谱技术能够整合医学知识，为临床决策提供支持。医疗知识库的建设对智能诊疗系统至关重要。",
        "chunk_index": 3,
    },
]

chunk_ids = []
for chunk in test_chunks:
    chunk_id = str(uuid4())
    chunk_ids.append(chunk_id)
    db.execute(
        """
        INSERT OR REPLACE INTO chunks (id, doc_id, chunk_index, text, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        """,
        (chunk_id, test_doc_id, chunk["chunk_index"], chunk["text"], "{}")
    )

db.commit()

# Insert vectors into Qdrant（embeddings=None 走统一 embedding_service，与生产路径一致）
print("Inserting vectors...")
vector_chunks = [{"text": c["text"], "metadata": {"chunk_index": c["chunk_index"]}} for c in test_chunks]

vector_service.upsert_vectors(
    doc_id=test_doc_id,
    chunks=vector_chunks,
    embeddings=None,
    kb_id=test_kb_id,
)

print("Test data setup complete!\n")

# Test searches
print("=" * 60)
print("Testing Keyword Search")
print("=" * 60)
keyword_results = search_service.keyword_search("医疗", kb_ids=[test_kb_id], limit=5)
print(f"Found {len(keyword_results)} results")
for i, result in enumerate(keyword_results, 1):
    print(f"\n{i}. Score: {result['score']:.2f}")
    print(f"   Text: {result['text'][:80]}...")
    print(f"   Source: {result['source']}")

print("\n" + "=" * 60)
print("Testing Semantic Search")
print("=" * 60)
semantic_results = search_service.semantic_search("疾病诊断", kb_ids=[test_kb_id], limit=5)
print(f"Found {len(semantic_results)} results")
for i, result in enumerate(semantic_results, 1):
    print(f"\n{i}. Score: {result['score']:.2f}")
    print(f"   Text: {result['text'][:80]}...")
    print(f"   Source: {result['source']}")

print("\n" + "=" * 60)
print("Testing Hybrid Search")
print("=" * 60)
hybrid_results = search_service.hybrid_search("人工智能诊断", kb_ids=[test_kb_id], mode="hybrid", limit=5)
print(f"Found {len(hybrid_results)} results")
for i, result in enumerate(hybrid_results, 1):
    print(f"\n{i}. Score: {result['score']:.2f}")
    print(f"   Text: {result['text'][:80]}...")
    print(f"   Source: {result['source']}")

print("\n" + "=" * 60)
print("Testing Formatted Results")
print("=" * 60)
formatted = search_service.format_results(hybrid_results if hybrid_results else keyword_results, "人工智能诊断")
print(f"Formatted {len(formatted)} results\n")
if formatted:
    print(json.dumps(formatted[0], ensure_ascii=False, indent=2))
else:
    print("No results to format")

print("\n" + "=" * 60)
print("All tests completed successfully!")
print("=" * 60)

# Cleanup
db.close()
