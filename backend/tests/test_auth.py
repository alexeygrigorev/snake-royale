from fastapi.testclient import TestClient

from app.store import store


def test_signup_returns_user_token_and_cookie(client: TestClient):
    response = client.post("/auth/signup", json={"username": "dana", "password": "secret"})

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["username"] == "dana"
    assert body["token"]
    assert body["tokenType"] == "bearer"
    assert "snake.session" in response.cookies
    assert store.find_user_by_username("dana").password_hash.startswith("pbkdf2_sha256$")


def test_login_rejects_bad_password(client: TestClient):
    response = client.post("/auth/login", json={"username": "alice", "password": "wrong"})

    assert response.status_code == 401
    assert response.json() == {"message": "Invalid username or password"}


def test_bearer_token_authenticates_protected_routes(client: TestClient):
    login = client.post("/auth/login", json={"username": "alice", "password": "password123"})
    token = login.json()["token"]

    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert me.status_code == 200
    assert me.json()["username"] == "alice"


def test_protected_route_without_token_returns_unauthorized(client: TestClient):
    client.cookies.clear()

    response = client.post("/scores", json={"mode": "walls", "score": 10})

    assert response.status_code == 401
    assert response.json() == {"message": "Authentication is required"}


def test_logout_revokes_token(client: TestClient):
    login = client.post("/auth/login", json={"username": "alice", "password": "password123"})
    token = login.json()["token"]

    logout = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    client.cookies.clear()
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

    assert logout.status_code == 204
    assert me.status_code == 204
