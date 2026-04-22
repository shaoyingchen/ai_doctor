# AI Doctor Backend (Unified Python Service)

This backend is now a **single Python service**.

## Architecture

- Unified API service: `http://localhost:8000`
- Main entry: `backend/app.py`
- Document parser logic: `backend/python-parser/parser.py` (imported internally)
- NLP annotation logic: `backend/nlp-annotator/annotator.py` (imported internally)

No separate `8001` / `8002` services are required.

## Quick Start

```bash
cd backend
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Or from `backend/package.json`:

```bash
npm run dev
```

## API Endpoints

- `GET /health`
- `POST /api/upload`
- `GET /api/tasks`
- `GET /api/tasks/{id}`
- `DELETE /api/tasks/{id}`
- `POST /api/tasks/{id}/retry`
- `GET /api/documents`
- `POST /api/annotate`
- `GET /api/queue/status`
- `GET /api/kb/tree`
- `POST /api/kb/nodes`
- `DELETE /api/kb/nodes/{id}`

## Notes

- Frontend API base remains `http://localhost:8000`.
- Uploaded files are stored in `<repo>/uploads/`.
- Parsed outputs are stored in `<repo>/parsed-data/`.
- SQLite data is stored in `<repo>/data/app.db`.
