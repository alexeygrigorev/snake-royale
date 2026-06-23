FROM node:24-bookworm-slim AS frontend-build

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build
RUN node - <<'EOF'
const fs = require("fs");
const path = require("path");

const clientDir = path.join(process.cwd(), "dist", "client");
const assetsDir = path.join(clientDir, "assets");
const files = fs.readdirSync(assetsDir);
const entry = files.find((file) => /^index-.*\.js$/.test(file));

if (!entry) {
  throw new Error("Could not find built frontend entry in dist/client/assets");
}

const styles = files
  .filter((file) => file.endsWith(".css"))
  .map((file) => `    <link rel="stylesheet" href="/assets/${file}">`)
  .join("\n");

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Snake Royale</title>
${styles}
  </head>
  <body>
    <script type="module" src="/assets/${entry}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(clientDir, "index.html"), html);
EOF

FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS backend

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    SNAKE_ROYALE_STATIC_DIR=/app/static

WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend ./
COPY --from=frontend-build /frontend/dist/client ./static

EXPOSE 8000

CMD ["/app/.venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
