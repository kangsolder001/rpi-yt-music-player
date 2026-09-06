from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    songs = relationship(
        "PlaylistSong", 
        back_populates="playlist", 
        cascade="all, delete-orphan",
        order_by="PlaylistSong.order_index"
    )

class PlaylistSong(Base):
    __tablename__ = "playlist_songs"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id", ondelete="CASCADE"), nullable=False, index=True)
    video_id = Column(String(64), nullable=False, index=True)
    title = Column(String(512), nullable=False)
    artist = Column(String(255), default="Unknown Artist")
    thumbnail_url = Column(Text, nullable=True)
    duration = Column(Integer, default=0)  # In seconds
    order_index = Column(Integer, default=0)
    added_at = Column(DateTime, default=datetime.utcnow)

    # Offline download tracking
    is_downloaded = Column(Integer, default=0)  # 0: false, 1: true
    file_path = Column(String(512), nullable=True)
    download_status = Column(String(32), default="none")  # 'none', 'downloading', 'completed', 'failed'

    playlist = relationship("Playlist", back_populates="songs")


