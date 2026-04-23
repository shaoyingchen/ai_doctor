# Unified Backend Usage

## Start

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Or:

```bash
cd backend
npm run dev
```

## Frontend API Base

Set frontend API base with:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Default fallback is `http://<current-host>:8000`.

## Smoke Check

```bash
curl http://localhost:8000/health
```

## Upload Test

```bash
curl -X POST http://localhost:8000/api/upload -F "files=@./some-file.txt"
```

## Task Polling

```bash
curl http://localhost:8000/api/tasks
```

## Annotation Test

```bash
curl -X POST http://localhost:8000/api/annotate \
  -H "Content-Type: application/json" \
  -d '{"content":"这是一个测试文档", "documentName":"test.txt"}'
```

## RAG Pipeline API

### 1) Parse by server file path

```bash
curl -X POST http://localhost:8000/api/rag/parse \
  -H "Content-Type: application/json" \
  -d '{
    "docId":"rag-doc-1",
    "sourceUri":"D:/personalProject/ai_doctor/backend/rag_pipeline/sample.txt",
    "filename":"sample.txt",
    "parserPreferences":{}
  }'
```

### 2) Parse by uploaded file (frontend-friendly)

```bash
curl -X POST http://localhost:8000/api/rag/parse-file \
  -F "file=@./some-file.txt" \
  -F "docId=rag-doc-2" \
  -F 'parserPreferences={}'
```

### 3) Enhance existing parsed chunks

```bash
curl -X POST http://localhost:8000/api/rag/enhance \
  -H "Content-Type: application/json" \
  -d '{"docId":"rag-doc-2"}'
```

### 4) End-to-end by uploaded file

```bash
curl -X POST http://localhost:8000/api/rag/end-to-end-file \
  -F "file=@./some-file.txt" \
  -F "docId=rag-doc-3" \
  -F 'parserPreferences={}'
```

### 5) Query latest RAG result and in-memory stores

```bash
curl http://localhost:8000/api/rag/results/rag-doc-3
```
