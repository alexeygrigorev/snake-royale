## Snake Royale Backend

FastAPI implementation of `../openapi.yaml` using an in-memory store.

Seeded users:

- `alice` / `password123`
- `bruno` / `password123`
- `casey` / `password123`

Run locally:

```bash
uv sync
uv run python main.py
```

Run tests:

```bash
uv run pytest
```
