# Snake Royale

Snake Royale is a snake game with a React frontend and a FastAPI backend.

## Requirements

- Python 3.12
- `uv`
- Node.js
- npm

## Backend

The backend lives in `backend/` and uses `uv` for dependency management.

Install dependencies:

```bash
cd backend
uv sync
```

Run the API:

```bash
uv run python main.py
```

The API starts on `http://localhost:8000`.

Run backend tests:

```bash
uv run pytest
```

Seeded users:

- `alice` / `password123`
- `bruno` / `password123`
- `casey` / `password123`

The backend uses an in-memory store, so new users, sessions, scores, and active
games reset when the server restarts.

## Frontend

The frontend lives in `frontend/`.

Install dependencies:

```bash
cd frontend
npm install
```

Run the frontend dev server:

```bash
npm run dev
```

Run frontend tests:

```bash
npm test
```

Build the frontend:

```bash
npm run build
```

## Notes

- The OpenAPI contract is in `openapi.yaml`.
- The frontend service entrypoint is `frontend/src/services/index.ts`.
- At the moment, the frontend is wired to the mock service implementation. Switch
  that entrypoint to an HTTP implementation when connecting it to the FastAPI
  backend.
