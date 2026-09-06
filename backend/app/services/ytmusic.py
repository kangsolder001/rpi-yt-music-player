import re
import logging
from typing import List, Optional, Dict, Any
from ytmusicapi import YTMusic
import yt_dlp
from backend.app.schemas import SearchResultItem

logger = logging.getLogger(__name__)

# Regex patterns for extracting YouTube video ID
YOUTUBE_URL_REGEX = re.compile(
    r"(?:https?:\/\/)?(?:www\.|music\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})"
)

class YTMusicService:
    """Service to search YouTube Music and resolve video metadata."""

    def __init__(self):
        try:
            self.ytm = YTMusic()
        except Exception as e:
            logger.warning("Could not initialize unauthenticated YTMusic: %s", e)
            self.ytm = None

    @staticmethod
    def extract_video_id(url_or_id: str) -> Optional[str]:
        """Extract an 11-char video ID from a URL or validate an existing ID."""
        url_or_id = url_or_id.strip()
        if len(url_or_id) == 11 and re.match(r"^[\w-]{11}$", url_or_id):
            return url_or_id

        match = YOUTUBE_URL_REGEX.search(url_or_id)
        if match:
            return match.group(1)
        return None

    def search_songs(self, query: str, limit: int = 15) -> List[SearchResultItem]:
        """Search songs on YouTube Music."""
        if not self.ytm or not query.strip():
            return []

        results: List[SearchResultItem] = []
        try:
            raw_results = self.ytm.search(query, filter="songs", limit=limit)
            for item in raw_results:
                video_id = item.get("videoId")
                if not video_id:
                    continue

                title = item.get("title", "Unknown Title")
                
                # Artists
                artists_list = item.get("artists", [])
                artist = ", ".join([a.get("name", "") for a in artists_list if a.get("name")]) or "Unknown Artist"

                # Duration
                duration_seconds = item.get("duration_seconds")
                duration_text = item.get("duration", "")
                if duration_seconds is None and duration_text:
                    duration_seconds = self._parse_duration_text(duration_text)

                # Thumbnail
                thumbnails = item.get("thumbnails", [])
                thumb_url = thumbnails[-1].get("url") if thumbnails else None

                results.append(SearchResultItem(
                    video_id=video_id,
                    title=title,
                    artist=artist,
                    thumbnail_url=thumb_url,
                    duration=duration_seconds or 0,
                    duration_text=duration_text or "0:00"
                ))
        except Exception as e:
            logger.error("Error searching YouTube Music for '%s': %s", query, e)

        return results

    def get_track_info(self, video_id_or_url: str) -> Optional[Dict[str, Any]]:
        """Get metadata for a single track by video ID or URL."""
        video_id = self.extract_video_id(video_id_or_url)
        if not video_id:
            return None

        # 1. Try ytmusicapi first
        if self.ytm:
            try:
                data = self.ytm.get_song(video_id)
                video_details = data.get("videoDetails", {})
                if video_details:
                    thumbnails = video_details.get("thumbnail", {}).get("thumbnails", [])
                    return {
                        "video_id": video_id,
                        "title": video_details.get("title", "Unknown Title"),
                        "artist": video_details.get("author", "Unknown Artist"),
                        "duration": int(video_details.get("lengthSeconds", 0)),
                        "thumbnail_url": thumbnails[-1].get("url") if thumbnails else None
                    }
            except Exception as e:
                logger.debug("ytmusicapi get_song failed for %s: %s", video_id, e)

        # 2. Fallback to yt-dlp metadata extraction
        try:
            ydl_opts = {
                "quiet": True,
                "no_warnings": True,
                "skip_download": True,
                "extract_flat": True
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
                if info:
                    return {
                        "video_id": video_id,
                        "title": info.get("title", "Unknown Title"),
                        "artist": info.get("uploader") or info.get("channel") or "Unknown Artist",
                        "duration": int(info.get("duration") or 0),
                        "thumbnail_url": info.get("thumbnail")
                    }
        except Exception as e:
            logger.error("yt-dlp extract_info failed for %s: %s", video_id, e)

        return None

    @staticmethod
    def _parse_duration_text(duration_text: str) -> int:
        """Parse 'MM:SS' or 'HH:MM:SS' into seconds."""
        parts = duration_text.split(":")
        try:
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        except ValueError:
            pass
        return 0

ytmusic_service = YTMusicService()

