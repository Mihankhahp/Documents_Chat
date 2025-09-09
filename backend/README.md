# Documents-Chat Backend

FastAPI backend for local RAG with:

- User management (very light-weight)
- File upload + parsing (**PDF/DOCX/CSV**, with **OCR** for images/scanned PDFs)
- Chunking (LangChain text splitters)
- Embeddings (Sentence Transformers)
- Vector store: **ChromaDB**
- Provider-agnostic chat (OpenAI-compatible or **Ollama**)
- Conversation history (SQLite via SQLAlchemy)

## Run (Dev)

```bash
pip install -e .
uvicorn app.main:app --reload
```



## Configuration

Env vars (defaults in `app/config.py`):

- `CHROMA_DIR` (default `/data/chroma_store`)
- `DB_URL` (default `sqlite:////data/app.db`)
- `OCR_ENABLED` = `true|false`
- `EMBEDDING_MODEL` (e.g., `sentence-transformers/all-MiniLM-L6-v2`)
- `LLM_PROVIDER` = `openai|ollama|...`
- `OPENAI_API_KEY` (if `openai`)
- `OLLAMA_BASE_URL` (if `ollama`)

Per-request overrides via headers:

- `X-LLM-Provider`, `X-LLM-Model`, `X-OpenAI-Key`

## API Overview

- `GET  /health`
- `POST /v1/auth/signup`, `POST /v1/auth/signin`
- `GET  /v1/files` — list files for current user
- `POST /v1/files` — upload & ingest (multipart `file`)
- `DELETE /v1/files/{doc_id}` — delete a single document’s chunks
- `POST /v1/reset` — wipe all of the current user’s data (files + chunks)
- `POST /v1/chat` — RAG chat **requires** `doc_ids` and `user-id` header
- `POST /v1/conversations` — create
- `GET  /v1/conversations` — list
- `GET  /v1/conversations/{id}` — fetch one
- `DELETE /v1/conversations/{id}` — delete
- `POST /v1/admin/reset_all` — admin maintenance

### Required header

`user-id: <string>`

All file operations and retrieval are scoped by `user_id`. The vector store filters on both `user_id` and `doc_id` so answers are **always** constrained to selected docs.

## Ingestion Flow (what happens on upload)

1. Accepts file via `multipart/form-data` as `file`.
2. Extracts text blobs:
   - PDF via `pypdf` (with fallback to OCR if images), DOCX via `python-docx`/`docx2txt`, CSV via `pandas`.
3. Splits into chunks (LangChain text splitters).
4. Embeds with Sentence Transformers.
5. Upserts to Chroma with metadata `{user_id, doc_id, file_name, page, ...}` and stores a `FileRecord` in SQLite.

## Chat Flow

- Retrieve top-N chunks filtered by `{user_id}` and the **explicit** `doc_ids` supplied in the request.
- Build system/prompt context from retrieved chunks.
- Call the selected LLM provider with optional per-request overrides.
- Store conversation turns.

## Docker

`backend/Dockerfile` installs system deps for OCR (tesseract, poppler). See root `docker-compose.yml` for example service config and healthcheck.

