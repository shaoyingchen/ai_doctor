# Hybrid Search API - Test Commands

## API Endpoint
`POST /api/search`

## Request Payload
```json
{
  "query": "search query string",
  "mode": "keyword|semantic|hybrid",
  "kbIds": ["kb-1", "kb-2"],  // optional, filter by knowledge base IDs
  "limit": 20                  // optional, default 20, max 100
}
```

## Response Format
```json
{
  "results": [
    {
      "id": "chunk-id",
      "docId": "doc-id",
      "title": "filename.pdf",
      "excerpt": "chunk text excerpt...",
      "highlightedExcerpt": "chunk with <mark>highlighted</mark> terms",
      "knowledgeBase": "个人库",
      "matchScore": 95.5,
      "metadata": {
        "chunkIndex": 3,
        "source": "hybrid",
        "folderId": "folder-1"
      }
    }
  ],
  "total": 10,
  "query": "original query",
  "mode": "hybrid"
}
```

## Test Commands

### 1. Keyword Search
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "医疗",
    "mode": "keyword",
    "kbIds": ["kb-1"],
    "limit": 10
  }'
```

### 2. Semantic Search
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "疾病诊断",
    "mode": "semantic",
    "kbIds": ["kb-1"],
    "limit": 10
  }'
```

### 3. Hybrid Search (RRF)
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "人工智能医疗诊断",
    "mode": "hybrid",
    "kbIds": ["kb-1", "kb-2"],
    "limit": 20
  }'
```

### 4. Search All Knowledge Bases
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "技术方案",
    "mode": "hybrid",
    "limit": 15
  }'
```

### 5. Search with Minimal Parameters
```bash
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "机器学习"
  }'
```

## Error Responses

### 400 Bad Request - Invalid Mode
```json
{
  "detail": "mode must be 'keyword', 'semantic', or 'hybrid'"
}
```

### 400 Bad Request - Empty Query
```json
{
  "detail": "query is required"
}
```

### 400 Bad Request - Invalid Limit
```json
{
  "detail": "limit must be between 1 and 100"
}
```

### 503 Service Unavailable
```json
{
  "detail": "Search service is unavailable"
}
```

## Search Modes Explained

### Keyword Search
- Uses SQLite LIKE query on the chunks table
- Fast, exact string matching
- Good for known terms and phrases
- Scores based on position and frequency

### Semantic Search
- Uses Qdrant vector similarity search
- Finds conceptually similar content
- Works across languages and synonyms
- Scores based on cosine similarity (0-100)

### Hybrid Search (Recommended)
- Combines keyword and semantic search
- Uses Reciprocal Rank Fusion (RRF) algorithm
- Best of both worlds: precision + recall
- Formula: score(d) = Σ(1 / (k + rank(d))) where k=60
- Returns merged and re-ranked results

## Implementation Details

### Files Created
1. `backend/services/search_service.py` - SearchService class with:
   - `keyword_search()` - SQLite full-text search
   - `semantic_search()` - Vector similarity search
   - `hybrid_search()` - Unified search interface
   - `rrf_merge()` - Reciprocal Rank Fusion algorithm
   - `format_results()` - API response formatting with highlighting

2. `backend/app.py` - Added:
   - `SearchPayload` model for request validation
   - `POST /api/search` endpoint
   - Initialized `search_service` instance

### Dependencies
- SQLite (built-in) - for keyword search
- Qdrant (already installed) - for semantic search
- No additional packages required

## Testing
Run the test script:
```bash
cd backend
python test_search_api.py
```

This will:
1. Insert test documents and chunks
2. Test keyword search
3. Test semantic search
4. Test hybrid search
5. Test result formatting with highlighting
