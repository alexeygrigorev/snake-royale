# Deploy to Koyeb + Neon

This deploy path keeps the app on a free-friendly setup:

- Koyeb runs the Docker web service.
- Neon provides the Postgres database.
- FastAPI serves the built frontend and API from the same domain.

## 1. Create the Neon database

1. Create a Neon project.
2. Copy the pooled or regular Postgres connection string.
3. Keep the database small enough for Neon's free plan limits.

The app expects a SQLAlchemy database URL in `SNAKE_ROYALE_DATABASE_URL`.
Neon connection strings are already Postgres URLs, so they can be used directly.

## 2. Deploy the Koyeb service

1. Create a Koyeb web service.
2. Choose GitHub as the source and select this repository.
3. Choose Dockerfile deployment.
4. Use the root `Dockerfile`.
5. Set the exposed port to `8000`.
6. Choose the free instance type.

## 3. Configure environment variables

Set these variables on the Koyeb service:

```text
SNAKE_ROYALE_DATABASE_URL=<your Neon Postgres connection string>
SNAKE_ROYALE_SECURE_COOKIES=true
```

The Docker image already sets `SNAKE_ROYALE_STATIC_DIR=/app/static`, so the
frontend build is served by FastAPI automatically.

## 4. Health check

Use this path:

```text
/health
```

The app should return:

```json
{"status":"ok"}
```

## 5. Local smoke test

Before deploying, run:

```bash
make test
docker build -t snake-royale .
docker run --rm -p 8000:8000 snake-royale
```

Then open `http://localhost:8000/health`.

## Notes

- Koyeb free services sleep after idle periods. The first request after sleep may
  be slower.
- Neon free databases can scale to zero after inactivity. The first database
  request after sleep may be slower.
- Do not use SQLite on Koyeb for persistent app data. Koyeb's free instance
  filesystem is ephemeral.
