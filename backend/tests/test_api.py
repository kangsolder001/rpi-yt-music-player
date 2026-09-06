import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import Base, engine

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup after test if needed

client = TestClient(app)

def test_healthcheck():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_player_status():
    response = client.get("/api/player/status")
    assert response.status_code == 200
    data = response.json()
    assert "volume" in data
    assert "is_playing" in data

def test_set_hardware_volume():
    response = client.post("/api/player/volume", json={"volume": 80})
    assert response.status_code == 200
    assert response.json()["volume"] == 80

def test_playlist_lifecycle():
    # 1. Create Playlist
    create_res = client.post("/api/playlists", json={
        "name": "Test Playlist Santai",
        "description": "Koleksi lagu santai untuk testing"
    })
    assert create_res.status_code == 200
    playlist = create_res.json()
    playlist_id = playlist["id"]
    assert playlist["name"] == "Test Playlist Santai"

    # 2. Add Song to Playlist
    song_res = client.post(f"/api/playlists/{playlist_id}/songs", json={
        "video_id": "dQw4w9WgXcQ",
        "title": "Never Gonna Give You Up",
        "artist": "Rick Astley",
        "duration": 213,
        "thumbnail_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    })
    assert song_res.status_code == 200
    song = song_res.json()
    assert song["title"] == "Never Gonna Give You Up"
    song_id = song["id"]

    # 3. Get Playlist Detail
    detail_res = client.get(f"/api/playlists/{playlist_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert len(detail["songs"]) == 1

    # 4. Remove Song
    del_song_res = client.delete(f"/api/playlists/{playlist_id}/songs/{song_id}")
    assert del_song_res.status_code == 200

    # 5. Delete Playlist
    del_res = client.delete(f"/api/playlists/{playlist_id}")
    assert del_res.status_code == 200

