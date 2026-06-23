## Snake Royale Backend

FastAPI implementation of `../openapi.yaml` using SQLAlchemy.

Seeded users:

- `alice` / `password123`
- `bruno` / `password123`
- `casey` / `password123`

Run locally:

```bash
uv sync
uv run python main.py
```

By default, the API stores data in `backend/snake_royale.db` with SQLite. Set
`SNAKE_ROYALE_DATABASE_URL` to use Postgres or another SQLAlchemy database URL.

With the local Postgres container:

```bash
export SNAKE_ROYALE_DATABASE_URL="postgresql://snakearena:snakearena@localhost:5432/snakearena"
uv run python main.py
```

Plain `postgresql://` and `postgres://` URLs are automatically loaded through
the Psycopg 3 driver.

Run tests:

```bash
uv run pytest
```
