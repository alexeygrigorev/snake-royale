from fastapi.testclient import TestClient


def test_user_can_sign_up_log_in_submit_score_and_read_leaderboard(
    client: TestClient,
) -> None:
    credentials = {"username": "river", "password": "secret123"}

    signup = client.post("/auth/signup", json=credentials)
    assert signup.status_code == 200
    assert signup.json()["user"]["username"] == "river"

    client.cookies.clear()
    login = client.post("/auth/login", json=credentials)
    assert login.status_code == 200

    token = login.json()["token"]
    submitted_score = client.post(
        "/scores",
        json={"mode": "walls", "score": 123},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert submitted_score.status_code == 201

    score_entry = submitted_score.json()
    assert score_entry["username"] == "river"
    assert score_entry["score"] == 123

    leaderboard = client.get("/leaderboard", params={"mode": "walls", "limit": 20})
    assert leaderboard.status_code == 200

    entries = leaderboard.json()
    assert any(
        entry["id"] == score_entry["id"]
        and entry["username"] == "river"
        and entry["score"] == 123
        and entry["mode"] == "walls"
        for entry in entries
    )
