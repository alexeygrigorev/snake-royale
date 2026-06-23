import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.routers import active_games, auth, scores


STATIC_DIR = Path(
    os.getenv("SNAKE_ROYALE_STATIC_DIR", Path(__file__).resolve().parents[1] / "static")
)
INDEX_HTML = STATIC_DIR / "index.html"
ASSETS_DIR = STATIC_DIR / "assets"
API_PREFIXES = ("/active-games", "/auth", "/health", "/leaderboard", "/scores")

app = FastAPI(
    title="Snake Royale Backend API",
    version="0.1.0",
    description="HTTP API for Snake Royale.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    message = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content={"message": message})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    first_error = exc.errors()[0] if exc.errors() else None
    message = first_error["msg"] if first_error else "Validation error"
    return JSONResponse(status_code=400, content={"message": message})


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(scores.router)
app.include_router(active_games.router)

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")


@app.get("/{path:path}", include_in_schema=False)
async def serve_frontend(path: str) -> FileResponse:
    request_path = f"/{path}"
    if request_path.startswith(API_PREFIXES) or not INDEX_HTML.exists():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(INDEX_HTML)
