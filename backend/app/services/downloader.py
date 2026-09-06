import os
import glob
import logging
import asyncio
from pathlib import Path
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
import yt_dlp

from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.models import PlaylistSong

logger = logging.getLogger(__name__)

class DownloaderService:
    """Handles downloading and local offline caching of YouTube audio tracks."""

    def __init__(self):
        self.downloads_dir = settings.DATA_DIR / "downloads"
        self.downloads_dir.mkdir(parents=True, exist_ok=True)
        self.executor = ThreadPoolExecutor(max_workers=2)

    def get_local_file_path(self, video_id: str) -> Optional[str]:
        """Check if audio file exists locally for a video ID."""
        patterns = [
            str(self.downloads_dir / f"{video_id}.opus"),
            str(self.downloads_dir / f"{video_id}.m4a"),
            str(self.downloads_dir / f"{video_id}.mp3"),
            str(self.downloads_dir / f"{video_id}.webm"),
        ]
        for p in patterns:
            if os.path.exists(p) and os.path.getsize(p) > 1024:
                return p

        # Check wildcard
        matches = glob.glob(str(self.downloads_dir / f"{video_id}.*"))
        for m in matches:
            if os.path.exists(m) and os.path.getsize(m) > 1024:
                return m

        return None

    def delete_local_file(self, video_id: str):
        """Remove local downloaded audio file for video_id if exists."""
        matches = glob.glob(str(self.downloads_dir / f"{video_id}.*"))
        for m in matches:
            try:
                if os.path.exists(m):
                    os.remove(m)
                    logger.info("Deleted offline file: %s", m)
            except Exception as e:
                logger.error("Failed to delete offline file %s: %s", m, e)

    def _download_task(self, video_id: str) -> Optional[str]:
        """Synchronous download worker running in thread pool."""
        existing = self.get_local_file_path(video_id)
        if existing:
            return existing

        url = f"https://www.youtube.com/watch?v={video_id}"
        outtmpl = str(self.downloads_dir / f"{video_id}.%(ext)s")

        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": outtmpl,
            "quiet": True,
            "no_warnings": True,
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "m4a",
                "preferredquality": "160",
            }],
            "extractor_args": {
                "youtube": {
                    "player_client": ["android", "web"]
                }
            }
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            downloaded_path = self.get_local_file_path(video_id)
            if downloaded_path:
                logger.info("Successfully downloaded track %s to %s", video_id, downloaded_path)
                return downloaded_path
        except Exception as e:
            logger.error("Failed downloading track %s: %s", video_id, e)

        return None

    def _process_download(self, song_id: int, video_id: str):
        """Worker that updates DB status and runs download task."""
        # 1. Set status to downloading
        db = SessionLocal()
        try:
            song = db.query(PlaylistSong).filter(PlaylistSong.id == song_id).first()
            if song:
                song.download_status = "downloading"
                db.commit()
        except Exception as e:
            logger.error("Error setting downloading status for %s: %s", song_id, e)
        finally:
            db.close()

        # 2. Run actual download
        file_path = self._download_task(video_id)

        # 3. Update result
        db = SessionLocal()
        try:
            song = db.query(PlaylistSong).filter(PlaylistSong.id == song_id).first()
            if song:
                if file_path:
                    song.is_downloaded = 1
                    song.file_path = file_path
                    song.download_status = "completed"
                else:
                    song.download_status = "failed"
                db.commit()
        except Exception as e:
            logger.error("Error setting completion status for %s: %s", song_id, e)
        finally:
            db.close()

    def enqueue_download(self, song_id: int, video_id: str):
        """Enqueue download into background thread pool."""
        self.executor.submit(self._process_download, song_id, video_id)

downloader_service = DownloaderService()
