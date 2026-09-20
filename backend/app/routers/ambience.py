import logging
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from backend.app.schemas import PlayerState
from backend.app.services.ambience import ambience_service
from backend.app.services.mpv_player import player_service
from backend.app.websocket import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ambience", tags=["ambience"])

@router.get("/catalog", response_model=List[Dict[str, Any]])
def get_catalog():
    """Retrieve all available ambient soundscapes and white noise presets."""
    return ambience_service.get_catalog()

@router.post("/play/{soundscape_id}", response_model=PlayerState)
async def play_soundscape(soundscape_id: str):
    """Play a local ambient soundscape in seamless gapless loop."""
    soundscape = ambience_service.get_soundscape(soundscape_id)
    if not soundscape:
        raise HTTPException(status_code=404, detail=f"Soundscape '{soundscape_id}' not found")

    file_path = ambience_service.get_file_path(soundscape_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Audio file for '{soundscape_id}' not found on server")

    player_service.play_ambience(
        ambience_id=soundscape_id,
        title=soundscape["title_id"],
        file_path=str(file_path),
        artist="Ambience & Sleep",
        thumbnail_url=None,
        duration=0
    )

    state = player_service.get_state()
    await ws_manager.broadcast_state()
    return state

