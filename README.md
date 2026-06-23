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

The backend uses SQLAlchemy and defaults to SQLite at `backend/snake_royale.db`.
Set `SNAKE_ROYALE_DATABASE_URL` to use Postgres or another SQLAlchemy database
URL.

For the Postgres container below:

```bash
export SNAKE_ROYALE_DATABASE_URL="postgresql://snakearena:snakearena@localhost:5432/snakearena"
uv run python main.py
```

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

The image stores SQLite data at `/data/snake_royale.db` by default. To point it
at the Postgres container above, run the app container on the host network or use
the Docker network name for the database host, then set
`SNAKE_ROYALE_DATABASE_URL`, for example:

```bash
docker run -it \
  --rm \
  --add-host=host.docker.internal:host-gateway \
  -p 8000:8000 \
  -e SNAKE_ROYALE_DATABASE_URL="postgresql://snakearena:snakearena@host.docker.internal:5432/snakearena" \
  snake-royale
```

## Notes

- The OpenAPI contract is in `openapi.yaml`.
- The frontend service entrypoint is `frontend/src/services/index.ts`.
- At the moment, the frontend is wired to the mock service implementation. Switch
  that entrypoint to an HTTP implementation when connecting it to the FastAPI
  backend.
