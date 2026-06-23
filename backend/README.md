## Snake Royale Backend

FastAPI implementation of `../openapi.yaml` using SQLite and SQLAlchemy.

Seeded users:

- `alice` / `password123`
- `bruno` / `password123`
- `casey` / `password123`

Run locally:

```bash
uv sync
uv run python main.py
```

By default, the API stores data in `backend/snake_royale.db`. Set
`SNAKE_ROYALE_DATABASE_URL` to use a different SQLAlchemy database URL.

Run tests:

```bash
uv run pytest
```
