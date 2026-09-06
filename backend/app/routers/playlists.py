from typing import List
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.database import get_db
from backend.app.models import Playlist, PlaylistSong
from backend.app.schemas import (
    PlaylistCreate, 
    PlaylistUpdate, 
    PlaylistResponse, 
    PlaylistDetailResponse, 
    SongCreate, 
    SongResponse,
    ImportPlaylistRequest
)
from backend.app.services.ytmusic import ytmusic_service
from backend.app.services.downloader import downloader_service

router = APIRouter(prefix="/api/playlists", tags=["playlists"])

@router.get("", response_model=List[PlaylistResponse])
def get_all_playlists(db: Session = Depends(get_db)):
    """List all playlists with song count."""
    playlists = db.query(Playlist).order_by(Playlist.created_at.desc()).all()
    result = []
    for pl in playlists:
        count = db.query(func.count(PlaylistSong.id)).filter(PlaylistSong.playlist_id == pl.id).scalar()
        result.append(PlaylistResponse(
            id=pl.id,
            name=pl.name,
            description=pl.description,
            created_at=pl.created_at,
            song_count=count or 0
        ))
    return result

@router.post("", response_model=PlaylistResponse)
def create_playlist(payload: PlaylistCreate, db: Session = Depends(get_db)):
    """Create a new playlist."""
    playlist = Playlist(name=payload.name, description=payload.description)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return PlaylistResponse(
        id=playlist.id,
        name=playlist.name,
        description=playlist.description,
        created_at=playlist.created_at,
        song_count=0
    )

@router.get("/{playlist_id}", response_model=PlaylistDetailResponse)
def get_playlist_detail(playlist_id: int, db: Session = Depends(get_db)):
    """Get playlist details and songs list."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    return playlist

@router.put("/{playlist_id}", response_model=PlaylistResponse)
def update_playlist(playlist_id: int, payload: PlaylistUpdate, db: Session = Depends(get_db)):
    """Update playlist name or description."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    if payload.name is not None:
        playlist.name = payload.name
    if payload.description is not None:
        playlist.description = payload.description

    db.commit()
    db.refresh(playlist)
    count = db.query(func.count(PlaylistSong.id)).filter(PlaylistSong.playlist_id == playlist.id).scalar()
    return PlaylistResponse(
        id=playlist.id,
        name=playlist.name,
        description=playlist.description,
        created_at=playlist.created_at,
        song_count=count or 0
    )

@router.delete("/{playlist_id}")
def delete_playlist(playlist_id: int, db: Session = Depends(get_db)):
    """Delete playlist, its songs, and clean up offline files."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Clean up downloaded audio files if not referenced in any other playlist
    for s in playlist.songs:
        other_count = db.query(PlaylistSong).filter(
            PlaylistSong.video_id == s.video_id,
            PlaylistSong.playlist_id != playlist_id
        ).count()
        if other_count == 0:
            downloader_service.delete_local_file(s.video_id)

    db.delete(playlist)
    db.commit()
    return {"message": "Playlist deleted successfully", "id": playlist_id}

@router.post("/{playlist_id}/songs", response_model=SongResponse)
def add_song_to_playlist(playlist_id: int, payload: SongCreate, db: Session = Depends(get_db)):
    """Add a song to playlist. Auto-fills metadata if only video_id/link is provided."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    video_id = ytmusic_service.extract_video_id(payload.video_id)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube video ID or URL")

    # If title is missing or default, try fetching metadata
    title = payload.title
    artist = payload.artist or "Unknown Artist"
    thumbnail_url = payload.thumbnail_url
    duration = payload.duration or 0

    if not title or title.strip() == "":
        meta = ytmusic_service.get_track_info(video_id)
        if meta:
            title = meta.get("title", "Unknown Title")
            artist = meta.get("artist", artist)
            thumbnail_url = meta.get("thumbnail_url", thumbnail_url)
            duration = meta.get("duration", duration)

    # Next order index
    max_order = db.query(func.max(PlaylistSong.order_index)).filter(PlaylistSong.playlist_id == playlist_id).scalar()
    next_order = (max_order or 0) + 1

    song = PlaylistSong(
        playlist_id=playlist_id,
        video_id=video_id,
        title=title or "Unknown Title",
        artist=artist,
        thumbnail_url=thumbnail_url,
        duration=duration,
        order_index=next_order,
        download_status="pending"
    )
    db.add(song)
    db.commit()
    db.refresh(song)

    # Immediately enqueue background download for offline caching
    downloader_service.enqueue_download(song.id, song.video_id)

    return song

@router.post("/{playlist_id}/download-all")
def download_all_songs_in_playlist(playlist_id: int, db: Session = Depends(get_db)):
    """Trigger background download for all un-downloaded songs in playlist."""
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    count = 0
    for s in playlist.songs:
        if not s.is_downloaded:
            downloader_service.enqueue_download(s.id, s.video_id)
            count += 1

    return {"message": f"Enqueued download for {count} songs", "count": count}

@router.post("/{playlist_id}/songs/{song_id}/download")
def download_single_song(playlist_id: int, song_id: int, db: Session = Depends(get_db)):
    """Trigger background download for a specific song."""
    song = db.query(PlaylistSong).filter(
        PlaylistSong.id == song_id, 
        PlaylistSong.playlist_id == playlist_id
    ).first()

    if not song:
        raise HTTPException(status_code=404, detail="Song not found")

    downloader_service.enqueue_download(song.id, song.video_id)
    return {"message": "Download enqueued", "song_id": song_id}

@router.delete("/{playlist_id}/songs/{song_id}")
def remove_song_from_playlist(playlist_id: int, song_id: int, db: Session = Depends(get_db)):
    """Remove a song from playlist and clean up offline file if not referenced elsewhere."""
    song = db.query(PlaylistSong).filter(
        PlaylistSong.id == song_id, 
        PlaylistSong.playlist_id == playlist_id
    ).first()

    if not song:
        raise HTTPException(status_code=404, detail="Song not found in this playlist")

    video_id = song.video_id

    db.delete(song)
    db.commit()

    # If no other playlist references this video_id, clean up the local audio file
    other_count = db.query(PlaylistSong).filter(PlaylistSong.video_id == video_id).count()
    if other_count == 0:
        downloader_service.delete_local_file(video_id)

    return {"message": "Song removed from playlist", "song_id": song_id}

@router.post("/import-youtube", response_model=PlaylistDetailResponse)
def import_youtube_playlist(payload: ImportPlaylistRequest, db: Session = Depends(get_db)):
    """Import an entire YouTube or YouTube Music playlist into local SQLite."""
    url = payload.url.strip()
    playlist_id = ytmusic_service.extract_playlist_id(url)
    if not playlist_id:
        raise HTTPException(
            status_code=400,
            detail="URL atau ID Playlist YouTube tidak valid. Contoh format: https://music.youtube.com/playlist?list=PL..."
        )
    
    max_songs = min(max(1, payload.max_songs or 100), 200)
    data = ytmusic_service.get_youtube_playlist(playlist_id, limit=max_songs)
    
    tracks = data.get("tracks", [])
    if not tracks:
        raise HTTPException(
            status_code=404,
            detail="Tidak dapat menemukan lagu pada playlist YouTube ini. Pastikan playlist bersifat Publik atau Unlisted."
        )
    
    # Determine playlist name & description
    name = (payload.custom_name or "").strip() or data.get("title") or "YouTube Playlist"
    desc = data.get("description") or f"Diimpor dari YouTube Playlist ({len(tracks)} lagu)"

    # 1. Create Playlist
    playlist = Playlist(name=name, description=desc)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)

    # 2. Add songs to PlaylistSong
    for idx, t in enumerate(tracks):
        song = PlaylistSong(
            playlist_id=playlist.id,
            video_id=t.video_id,
            title=t.title,
            artist=t.artist,
            thumbnail_url=t.thumbnail_url,
            duration=t.duration,
            order_index=idx + 1,
            download_status="pending"
        )
        db.add(song)

    db.commit()
    db.refresh(playlist)

    return playlist


