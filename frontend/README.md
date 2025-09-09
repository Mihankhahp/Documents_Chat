# Documents Chat Frontend (React + Vite)

Single-page app for the RAG backend.

## Dev

```bash
npm install
npm run dev  # http://localhost:5173
```

Configure the backend base URL via either:
- `.env` with `VITE_API_BASE=http://localhost:8000`
- `public/app-config.js` by setting `window.__APP_CONFIG__.API_BASE`

The app sends a `user-id` header on requests. In development this is stored in local storage and can be switched from the Settings UI.

## Build / Container

- `npm run build` produces the static site into `dist/`.
- `frontend/Dockerfile` builds and serves with Nginx (exposes port 80).

## API Client

See `src/services/api.js` for the thin wrapper which:
- Reads `API_BASE` from env or `app-config.js`.
- Attaches `user-id` header when present.
- Throws for non-2xx and returns parsed JSON payloads.
