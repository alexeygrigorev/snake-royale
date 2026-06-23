from fastapi.testclient import TestClient


def _auth_header(client: TestClient, username: str = "alice") -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": "password123"},
    )
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_seeded_leaderboard_is_sorted_by_score(client: TestClient):
    response = client.get("/api/leaderboard", params={"mode": "walls"})

    assert response.status_code == 200
    scores = [entry["score"] for entry in response.json()]
    assert scores == sorted(scores, reverse=True)
    assert len(scores) >= 2


def test_submit_score_records_current_user(client: TestClient):
    response = client.post(
        "/api/scores",
        json={"mode": "wrap", "score": 99},
        headers=_auth_header(client),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["username"] == "alice"
    assert body["mode"] == "wrap"
    assert body["score"] == 99


def test_invalid_score_returns_spec_error_shape(client: TestClient):
    response = client.post(
        "/api/scores",
        json={"mode": "wrap", "score": -1},
        headers=_auth_header(client),
    )

    assert response.status_code == 400
    assert "message" in response.json()
