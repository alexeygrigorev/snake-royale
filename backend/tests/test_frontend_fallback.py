import app.main as main_module


def test_leaderboard_path_serves_frontend_shell(client, monkeypatch, tmp_path):
    index_html = tmp_path / "index.html"
    index_html.write_text("<!doctype html><title>Snake Royale</title>", encoding="utf-8")
    monkeypatch.setattr(main_module, "INDEX_HTML", index_html)

    response = client.get("/leaderboard")

    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "Snake Royale" in response.text


def test_api_leaderboard_still_requires_mode(client):
    response = client.get("/api/leaderboard")

    assert response.status_code == 400
    assert response.json() == {"message": "Field required"}
