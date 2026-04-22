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
