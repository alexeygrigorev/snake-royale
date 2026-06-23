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

The backend uses SQLite through SQLAlchemy. By default, data is stored in
`backend/snake_royale.db`; set `SNAKE_ROYALE_DATABASE_URL` to use a different
SQLAlchemy database URL.

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

## Docker

Build the production image:

```bash
docker build -t snake-royale .
```

Run it with a persistent SQLite database volume:

```bash
docker run -it \
  --rm \
  -p 8000:8000 \
  -e SNAKE_ROYALE_DATABASE_URL="sqlite:////data/snake_royale.db" \
  -v snake-royale-data:/data \
  snake-royale
```

The image stores SQLite data at `/data/snake_royale.db` by default. Override
`SNAKE_ROYALE_DATABASE_URL` if you need a different database URL.

## Notes

- The OpenAPI contract is in `openapi.yaml`.
- The frontend service entrypoint is `frontend/src/services/index.ts`.
- At the moment, the frontend is wired to the mock service implementation. Switch
  that entrypoint to an HTTP implementation when connecting it to the FastAPI
  backend.
