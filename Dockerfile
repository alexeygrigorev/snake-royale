FROM node:24-bookworm-slim AS frontend-build

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build
RUN node --input-type=module - <<'EOF'
import fs from "node:fs";
import path from "node:path";

const server = (await import("./dist/server/server.js")).default;
const response = await server.fetch(new Request("http://localhost/"), {}, {});

if (!response.ok) {
  throw new Error(`Frontend prerender failed with status ${response.status}`);
}

const html = await response.text();

if (!html.includes("$_TSR")) {
  throw new Error("Frontend prerender did not include TanStack hydration data");
}

fs.writeFileSync(path.join(process.cwd(), "dist", "client", "index.html"), html);
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
