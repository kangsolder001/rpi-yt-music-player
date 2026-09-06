import re
import time
import logging
from typing import List, Optional, Dict, Any, Tuple
from ytmusicapi import YTMusic
import yt_dlp
from backend.app.schemas import SearchResultItem

logger = logging.getLogger(__name__)

# Regex patterns for extracting YouTube video ID & playlist ID
YOUTUBE_URL_REGEX = re.compile(
    r"(?:https?:\/\/)?(?:www\.|music\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})"
)
PLAYLIST_URL_REGEX = re.compile(
    r"[?&]list=([a-zA-Z0-9_-]+)"
)

RECOMMENDATION_CATEGORIES = {
    "trending": {"title": "Populer Hari Ini", "query": "Top Hits Indonesia 2024", "emoji": "🔥"},
    "relax": {"title": "Santai & Akustik", "query": "Lagu Akustik Indonesia Santai", "emoji": "☕"},
    "focus": {"title": "Fokus & Lo-Fi", "query": "Lofi Chill Beats Study", "emoji": "🎧"},
    "galau": {"title": "Galau & Nostalgia", "query": "Lagu Pop Indo Galau Terbaik", "emoji": "🌧️"},
    "energetic": {"title": "Semangat & Rock", "query": "Lagu Rock Pop Indo Energetic", "emoji": "⚡"},
}

class YTMusicService:
    """Service to search YouTube Music and resolve video metadata."""

    def __init__(self):
        try:
            self.ytm = YTMusic()
        except Exception as e:
            logger.warning("Could not initialize unauthenticated YTMusic: %s", e)
            self.ytm = None
        self._rec_cache: Dict[str, Tuple[float, List[SearchResultItem]]] = {}
        self._search_cache: Dict[str, Tuple[float, List[SearchResultItem]]] = {}

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

    @staticmethod
    def extract_playlist_id(url_or_id: str) -> Optional[str]:
        """Extract a playlist ID from a URL or validate an existing playlist ID."""
        url_or_id = url_or_id.strip()
        match = PLAYLIST_URL_REGEX.search(url_or_id)
        if match:
            return match.group(1)
        if re.match(r"^[a-zA-Z0-9_-]{12,}$", url_or_id):
            return url_or_id
        return None

    def search_songs(self, query: str, limit: int = 20, offset: int = 0) -> List[SearchResultItem]:
        """Search songs on YouTube Music with offset and caching support."""
        if not self.ytm or not query.strip():
            return []

        q_key = query.strip().lower()
        now = time.time()
        needed_total = offset + limit

        # Check search cache (15 min TTL)
        cached_entry = self._search_cache.get(q_key)
        if cached_entry:
            cache_time, cached_items = cached_entry
            if now - cache_time < 900:
                if len(cached_items) >= needed_total:
                    return cached_items[offset:needed_total]

        # Fetch more from ytmusicapi (fetch at least needed_total, min 30, up to 100)
        fetch_limit = min(max(needed_total, 30), 100)
        results: List[SearchResultItem] = []
        try:
            raw_results = self.ytm.search(query, filter="songs", limit=fetch_limit)
            seen_ids = set()
            for item in raw_results:
                video_id = item.get("videoId")
                if not video_id or video_id in seen_ids:
                    continue
                seen_ids.add(video_id)

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

            self._search_cache[q_key] = (now, results)
        except Exception as e:
            logger.error("Error searching YouTube Music for '%s': %s", query, e)
            if cached_entry:
                results = cached_entry[1]

        return results[offset:needed_total]

    def get_recommendations(self, category: Optional[str] = "trending", limit: int = 18, offset: int = 0) -> Dict[str, Any]:
        """Get curated recommendation songs by category (with in-memory TTL caching and pagination)."""
        cat_key = category if category in RECOMMENDATION_CATEGORIES else "trending"
        cat_info = RECOMMENDATION_CATEGORIES[cat_key]

        now = time.time()
        cached_entry = self._rec_cache.get(cat_key)
        items: List[SearchResultItem] = []

        if cached_entry:
            cache_time, cached_items = cached_entry
            if now - cache_time < 3600 and cached_items:
                items = cached_items

        if not items:
            items = self.search_songs(cat_info["query"], limit=60, offset=0)
            if items:
                self._rec_cache[cat_key] = (now, items)

        sliced_items = items[offset: offset + limit]
        has_more = (offset + limit) < len(items)

        return {
            "category": cat_key,
            "title": cat_info["title"],
            "emoji": cat_info["emoji"],
            "items": sliced_items,
            "total": len(items),
            "has_more": has_more,
            "categories": [
                {"id": k, "title": v["title"], "emoji": v["emoji"]}
                for k, v in RECOMMENDATION_CATEGORIES.items()
            ]
        }

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

    def get_related_tracks(self, video_id: str, limit: int = 25) -> List[SearchResultItem]:
        """Get related / radio watch playlist tracks for a song."""
        if not video_id:
            return []

        results: List[SearchResultItem] = []
        # 1. Try ytmusicapi get_watch_playlist
        if self.ytm:
            try:
                watch_data = self.ytm.get_watch_playlist(videoId=video_id, limit=limit)
                raw_tracks = watch_data.get("tracks", [])
                for item in raw_tracks:
                    v_id = item.get("videoId")
                    if not v_id or v_id == video_id:
                        continue

                    title = item.get("title", "Unknown Title")
                    artists_list = item.get("artists", [])
                    artist = ", ".join([a.get("name", "") for a in artists_list if a.get("name")]) or "Unknown Artist"

                    duration_text = item.get("length", "")
                    duration_seconds = self._parse_duration_text(duration_text) if duration_text else 0

                    thumbnails = item.get("thumbnail", [])
                    thumb_url = thumbnails[-1].get("url") if thumbnails else None

                    results.append(SearchResultItem(
                        video_id=v_id,
                        title=title,
                        artist=artist,
                        thumbnail_url=thumb_url,
                        duration=duration_seconds,
                        duration_text=duration_text or "0:00"
                    ))
            except Exception as e:
                logger.error("Error getting watch playlist for %s: %s", video_id, e)

        # 2. Fallback: if get_watch_playlist returned nothing, search for related radio
        if not results:
            track_info = self.get_track_info(video_id)
            if track_info:
                query = f"{track_info.get('artist', '')} {track_info.get('title', '')} song"
                results = self.search_songs(query, limit=10)
                # Exclude the same track
                results = [r for r in results if r.video_id != video_id]

        return results

    def get_youtube_playlist(self, playlist_id: str, limit: int = 100) -> Dict[str, Any]:
        """
        Fetch playlist metadata and songs from YouTube Music,
        with automatic fallback to yt-dlp.
        """
        clean_id = playlist_id.strip()
        if clean_id.startswith("VL"):
            clean_id = clean_id[2:]

        title = "YouTube Playlist"
        description = "Diimpor dari YouTube"
        thumbnail_url = None
        tracks: List[SearchResultItem] = []

        # 1. Try ytmusicapi first
        if self.ytm:
            try:
                res = self.ytm.get_playlist(clean_id, limit=limit)
                title = res.get("title") or title
                description = res.get("description") or description
                thumbs = res.get("thumbnails", [])
                if thumbs:
                    thumbnail_url = thumbs[-1].get("url")

                raw_tracks = res.get("tracks", [])
                for item in raw_tracks[:limit]:
                    v_id = item.get("videoId")
                    if not v_id:
                        continue
                    t_title = item.get("title", "Unknown Title")
                    artists_list = item.get("artists", [])
                    t_artist = ", ".join([a.get("name", "") for a in artists_list if a.get("name")]) or "Unknown Artist"
                    dur_sec = item.get("duration_seconds")
                    if dur_sec is None:
                        dur_text = item.get("duration") or ""
                        dur_sec = self._parse_duration_text(dur_text) if dur_text else 0
                    
                    t_thumbs = item.get("thumbnails", [])
                    t_thumb = t_thumbs[-1].get("url") if t_thumbs else None
                    if not thumbnail_url and t_thumb:
                        thumbnail_url = t_thumb

                    tracks.append(SearchResultItem(
                        video_id=v_id,
                        title=t_title,
                        artist=t_artist,
                        thumbnail_url=t_thumb,
                        duration=dur_sec,
                        duration_text=f"{dur_sec // 60}:{dur_sec % 60:02d}"
                    ))
            except Exception as e:
                logger.warning("ytmusicapi get_playlist failed for %s (%s). Falling back to yt-dlp.", clean_id, e)

        # 2. Fallback to yt-dlp if no tracks fetched
        if not tracks:
            try:
                import subprocess
                import json
                playlist_url = f"https://www.youtube.com/playlist?list={clean_id}"
                cmd = [
                    "yt-dlp",
                    "--flat-playlist",
                    "-J",
                    "--playlist-end", str(limit),
                    playlist_url
                ]
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=35)
                if proc.returncode == 0 and proc.stdout:
                    data = json.loads(proc.stdout)
                    title = data.get("title") or title
                    description = data.get("description") or description
                    entries = data.get("entries", [])
                    for entry in entries:
                        v_id = entry.get("id")
                        if not v_id:
                            continue
                        t_title = entry.get("title", "Unknown Title")
                        t_artist = entry.get("uploader") or entry.get("channel") or "Unknown Artist"
                        dur_sec = int(entry.get("duration") or 0)
                        t_thumb = entry.get("thumbnail") or f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg"
                        if not thumbnail_url and t_thumb:
                            thumbnail_url = t_thumb

                        tracks.append(SearchResultItem(
                            video_id=v_id,
                            title=t_title,
                            artist=t_artist,
                            thumbnail_url=t_thumb,
                            duration=dur_sec,
                            duration_text=f"{dur_sec // 60}:{dur_sec % 60:02d}"
                        ))
            except Exception as e:
                logger.error("yt-dlp playlist extraction failed for %s: %s", clean_id, e)

        return {
            "playlist_id": clean_id,
            "title": title,
            "description": description,
            "thumbnail_url": thumbnail_url,
            "tracks": tracks
        }

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


