from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from backend.app.schemas import SearchResultItem
from backend.app.services.ytmusic import ytmusic_service

router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("", response_model=List[SearchResultItem])
def search_youtube_music(q: str = Query(..., min_length=1, description="Song title or artist query"), limit: int = 15):
    """Search YouTube Music songs by keywords."""
    return ytmusic_service.search_songs(query=q, limit=limit)

@router.get("/resolve", response_model=SearchResultItem)
def resolve_youtube_url(url: str = Query(..., description="YouTube video URL or Video ID")):
    """Extract metadata from a direct YouTube URL or Video ID."""
    info = ytmusic_service.get_track_info(url)
    if not info:
        raise HTTPException(status_code=400, detail="Could not resolve YouTube URL or video ID")

    return SearchResultItem(
        video_id=info["video_id"],
        title=info["title"],
        artist=info["artist"],
        thumbnail_url=info.get("thumbnail_url"),
        duration=info.get("duration", 0),
        duration_text=f"{info.get('duration', 0) // 60}:{info.get('duration', 0) % 60:02d}"
    )

