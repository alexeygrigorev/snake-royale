from fastapi.testclient import TestClient


def _auth_header(client: TestClient, username: str = "alice") -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": "password123"},
    )
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_lists_seeded_active_games(client: TestClient):
    response = client.get("/api/active-games")

    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 2
    assert {"gameId", "username", "mode", "score", "updatedAt"} <= set(body[0])


def test_watch_active_game_and_not_found(client: TestClient):
    game_id = client.get("/api/active-games").json()[0]["gameId"]

    found = client.get(f"/api/active-games/{game_id}")
    missing = client.get("/api/active-games/nope")

    assert found.status_code == 200
    assert found.json()["gameId"] == game_id
    assert missing.status_code == 404
    assert missing.json() == {"message": "Active game not found"}


def test_publish_overwrites_identity_from_token(client: TestClient):
    response = client.put(
        "/api/active-games",
        json={
            "gameId": "game_new",
            "userId": "spoofed",
            "username": "spoofed",
            "mode": "walls",
            "score": 7,
            "snake": [{"x": 1, "y": 1}],
            "food": {"x": 2, "y": 2},
            "width": 20,
            "height": 20,
            "alive": True,
            "updatedAt": 4100000000000,
        },
        headers=_auth_header(client, "bruno"),
    )
    snapshot = client.get("/api/active-games/game_new").json()

    assert response.status_code == 204
    assert snapshot["username"] == "bruno"
    assert snapshot["userId"] != "spoofed"


def test_end_game_requires_auth_and_is_idempotent(client: TestClient):
    client.cookies.clear()
    unauthorized = client.delete("/api/active-games/game_alice_walls")
    authorized = client.delete("/api/active-games/game_alice_walls", headers=_auth_header(client))
    repeated = client.delete("/api/active-games/game_alice_walls", headers=_auth_header(client))

    assert unauthorized.status_code == 401
    assert authorized.status_code == 204
    assert repeated.status_code == 204
