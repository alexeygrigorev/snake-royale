from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

import app.auth as auth_module
import app.routers.active_games as active_games_router
import app.routers.auth as auth_router
import app.routers.scores as scores_router
import app.store as store_module
from app.main import app as fastapi_app
from app.store import DatabaseStore


@pytest.fixture
def client(tmp_path, monkeypatch) -> Iterator[TestClient]:
    database_path = tmp_path / "snake_royale_integration.db"
    test_store = DatabaseStore(f"sqlite:///{database_path}")

    monkeypatch.setattr(store_module, "store", test_store)
    monkeypatch.setattr(auth_module, "store", test_store)
    monkeypatch.setattr(auth_router, "store", test_store)
    monkeypatch.setattr(scores_router, "store", test_store)
    monkeypatch.setattr(active_games_router, "store", test_store)

    try:
        with TestClient(fastapi_app) as test_client:
            yield test_client
    finally:
        test_store.engine.dispose()
