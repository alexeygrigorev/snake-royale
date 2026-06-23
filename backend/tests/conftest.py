import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.store import store


@pytest.fixture(autouse=True)
def reset_store():
    store.reset()
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
