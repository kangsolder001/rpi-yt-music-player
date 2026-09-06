from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Playlist, PlaylistSong
from backend.app.schemas import (
    PlayerState, PlaySongRequest, VolumeRequest, SeekRequest, RepeatRequest,
    AutoplayRequest, EqualizerUpdateRequest, EqualizerPresetRequest
)
from backend.app.services.mpv_player import player_service
from backend.app.services.audio_mixer import audio_mixer
from backend.app.services.equalizer import equalizer_service
from backend.app.websocket import ws_manager

router = APIRouter(prefix="/api/player", tags=["player"])

@router.get("/status", response_model=PlayerState)
def get_player_status():
    """Get current playback status, track metadata, and hardware volume."""
    player_service.update_status_from_mpv()
    return player_service.get_state()

@router.post("/play", response_model=PlayerState)
async def play_song(req: PlaySongRequest):
    """Play a single song immediately."""
    player_service.play_song(
        video_id=req.video_id,
        title=req.title or "Unknown Title",
        artist=req.artist or "Unknown Artist",
        thumbnail_url=req.thumbnail_url or "",
        duration=req.duration or 0
    )
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/play-playlist/{playlist_id}", response_model=PlayerState)
async def play_playlist(playlist_id: int, start_index: int = 0, db: Session = Depends(get_db)):
    """Play an entire playlist starting at index."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    if not playlist.songs:
        raise HTTPException(status_code=400, detail="Playlist is empty")

    songs_data = [
        {
            "video_id": s.video_id,
            "title": s.title,
            "artist": s.artist,
            "thumbnail_url": s.thumbnail_url,
            "duration": s.duration
        }
        for s in playlist.songs
    ]

    player_service.play_playlist(songs_data, playlist_id=playlist.id, start_index=start_index)
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/toggle", response_model=PlayerState)
async def toggle_play_pause():
    """Toggle play / pause."""
    player_service.toggle_play_pause()
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/pause", response_model=PlayerState)
async def pause_player():
    """Pause playback."""
    player_service.pause()
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/resume", response_model=PlayerState)
async def resume_player():
    """Resume playback."""
    player_service.resume()
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/stop", response_model=PlayerState)
async def stop_player():
    """Stop playback."""
    player_service.stop()
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/next", response_model=PlayerState)
async def next_track():
    """Skip to next track."""
    player_service.next_track()
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/previous", response_model=PlayerState)
async def previous_track():
    """Previous track."""
    player_service.previous_track()
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/seek", response_model=PlayerState)
async def seek_playback(req: SeekRequest):
    """Seek to a specific second."""
    player_service.seek(req.position)
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/volume", response_model=PlayerState)
async def set_hardware_volume(req: VolumeRequest):
    """Set ALSA hardware volume percentage."""
    audio_mixer.set_volume(req.volume)
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/repeat", response_model=PlayerState)
async def set_repeat_mode(req: RepeatRequest):
    """Set repeat mode: 'off', 'all', 'one'."""
    player_service.set_repeat_mode(req.mode)
    await ws_manager.broadcast_state()
    return player_service.get_state()

@router.post("/autoplay", response_model=PlayerState)
async def set_autoplay(req: AutoplayRequest):
    """Enable or disable autoplay of similar recommended tracks."""
    player_service.set_autoplay(req.enabled)
    await ws_manager.broadcast_state()
    return player_service.get_state()

# Equalizer & Audio Enhancer Endpoints
@router.get("/equalizer")
def get_equalizer():
    """Get current equalizer configuration, bands, and presets."""
    return equalizer_service.get_state()

@router.post("/equalizer")
def update_equalizer(req: EqualizerUpdateRequest):
    """Update custom equalizer bands and filters."""
    bands_dict = [b.model_dump() for b in req.bands] if req.bands is not None else None
    return equalizer_service.update_settings(
        bands=bands_dict,
        normalizer_enabled=req.normalizer_enabled,
        stereo_widen=req.stereo_widen,
        mpv_player=player_service
    )

@router.post("/equalizer/preset")
def set_equalizer_preset(req: EqualizerPresetRequest):
    """Apply an instant equalizer preset."""
    try:
        return equalizer_service.set_preset(req.preset, player_service)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# WebSocket Endpoint
@router.websocket("/ws")
async def player_websocket(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # We just listen for incoming ping / heartbeat or commands if any
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

