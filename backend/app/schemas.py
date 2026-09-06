from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# --- Song Schemas ---
class SongBase(BaseModel):
    video_id: str
    title: str
    artist: Optional[str] = "Unknown Artist"
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = 0

class SongCreate(SongBase):
    pass

class SongResponse(SongBase):
    id: int
    playlist_id: int
    order_index: int
    added_at: datetime
    is_downloaded: bool = False
    file_path: Optional[str] = None
    download_status: str = "none"

    class Config:
        from_attributes = True

# --- Playlist Schemas ---
class PlaylistBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class PlaylistCreate(PlaylistBase):
    pass

class PlaylistUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None

class PlaylistResponse(PlaylistBase):
    id: int
    created_at: datetime
    song_count: int = 0

    class Config:
        from_attributes = True

class PlaylistDetailResponse(PlaylistBase):
    id: int
    created_at: datetime
    songs: List[SongResponse] = []

    class Config:
        from_attributes = True

# --- Player & Control Schemas ---
class TrackInfo(BaseModel):
    video_id: Optional[str] = None
    title: Optional[str] = "No Track Playing"
    artist: Optional[str] = ""
    thumbnail_url: Optional[str] = None
    duration: float = 0.0

class PlayerState(BaseModel):
    is_playing: bool = False
    is_paused: bool = False
    is_idle: bool = True
    current_time: float = 0.0
    duration: float = 0.0
    volume: int = 75  # ALSA Hardware volume (0 - 100)
    repeat_mode: str = "off"  # "off", "all", "one"
    autoplay: bool = True  # Auto-play similar recommended tracks
    current_track: Optional[TrackInfo] = None
    playlist_id: Optional[int] = None
    queue_length: int = 0

class PlaySongRequest(BaseModel):
    video_id: str
    title: Optional[str] = None
    artist: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[int] = 0

class VolumeRequest(BaseModel):
    volume: int = Field(..., ge=0, le=100)

class SeekRequest(BaseModel):
    position: float = Field(..., ge=0)

class RepeatRequest(BaseModel):
    mode: str = Field(..., pattern="^(off|all|one)$")

class AutoplayRequest(BaseModel):
    enabled: bool

# --- Search Schemas ---
class SearchResultItem(BaseModel):
    video_id: str
    title: str
    artist: str
    thumbnail_url: Optional[str] = None
    duration: int = 0
    duration_text: Optional[str] = ""

# --- Equalizer Schemas ---
class EqualizerBand(BaseModel):
    frequency: int
    gain: int = Field(..., ge=-12, le=12)

class EqualizerUpdateRequest(BaseModel):
    bands: Optional[List[EqualizerBand]] = None
    normalizer_enabled: Optional[bool] = None
    stereo_widen: Optional[bool] = None

class EqualizerPresetRequest(BaseModel):
    preset: str

# --- Queue Schemas ---
class QueueItem(BaseModel):
    index: int
    video_id: str
    title: str
    artist: Optional[str] = "Unknown Artist"
    thumbnail_url: Optional[str] = None
    duration: float = 0.0
    is_current: bool = False

class QueueResponse(BaseModel):
    current_index: int
    total: int
    items: List[QueueItem]

# --- Import Playlist Schema ---
class ImportPlaylistRequest(BaseModel):
    url: str
    custom_name: Optional[str] = None
    max_songs: Optional[int] = 100

