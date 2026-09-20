import time
import logging
import threading
import urllib.parse
from typing import Optional, Dict, Tuple
from concurrent.futures import ThreadPoolExecutor
import yt_dlp

logger = logging.getLogger(__name__)


class StreamResolverService:
    """
    High-performance in-process YouTube audio stream resolver.
    Maintains an in-memory cache of direct googlevideo streaming URLs with TTL,
    and supports background prefetching for the next track in queue.
    """

    def __init__(self):
        self._cache: Dict[str, Tuple[str, float]] = {}  # video_id -> (stream_url, expire_timestamp)
        self._lock = threading.Lock()
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="StreamResolver")
        self._pending_prefetches = set()

        ydl_opts = {
            "format": "bestaudio/best",
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "extractor_args": {
                "youtube": {
                    "player_client": ["android"],
                    "skip": ["webpage", "translated_subs"]
                }
            }
        }
        try:
            self._ydl = yt_dlp.YoutubeDL(ydl_opts)
        except Exception as e:
            logger.error("Failed to initialize YoutubeDL in StreamResolverService: %s", e)
            self._ydl = None

    def get_cached_url(self, video_id: str) -> Optional[str]:
        """Return cached stream URL if valid and not expired."""
        with self._lock:
            cached = self._cache.get(video_id)
            if cached:
                url, expire_ts = cached
                # Ensure at least 5 minutes remaining before expiry
                if time.time() < expire_ts - 300:
                    return url
                else:
                    self._cache.pop(video_id, None)
        return None

    def resolve_stream_url(self, video_id: str) -> Optional[str]:
        """
        Synchronously resolve direct audio stream URL for video_id.
        Returns cached URL immediately if valid, or extracts using in-process YoutubeDL.
        """
        cached = self.get_cached_url(video_id)
        if cached:
            logger.info("Stream cache HIT for video %s", video_id)
            return cached

        if not self._ydl:
            return None

        t0 = time.time()
        try:
            url_target = f"https://www.youtube.com/watch?v={video_id}"
            info = self._ydl.extract_info(url_target, download=False)
            if not info:
                return None

            stream_url = info.get("url")
            if not stream_url:
                # Try from formats if top-level url missing
                formats = info.get("formats", [])
                for fmt in reversed(formats):
                    if fmt.get("url") and (fmt.get("acodec") != "none" or fmt.get("audio_channels")):
                        stream_url = fmt["url"]
                        break

            if not stream_url:
                logger.warning("No stream URL extracted for %s", video_id)
                return None

            # Determine expiry timestamp from googlevideo URL query param 'expire'
            expire_ts = time.time() + 18000  # default 5 hours
            try:
                parsed = urllib.parse.urlparse(stream_url)
                qs = urllib.parse.parse_qs(parsed.query)
                if "expire" in qs:
                    expire_ts = float(qs["expire"][0])
            except Exception:
                pass

            with self._lock:
                self._cache[video_id] = (stream_url, expire_ts)
                # Keep cache bounded to 150 items
                if len(self._cache) > 150:
                    oldest_key = min(self._cache.keys(), key=lambda k: self._cache[k][1])
                    self._cache.pop(oldest_key, None)

            elapsed = time.time() - t0
            logger.info("Resolved direct stream URL for %s in %.2fs (Expires in: %.1fh)", video_id, elapsed, (expire_ts - time.time()) / 3600)
            return stream_url

        except Exception as e:
            logger.warning("Failed resolving direct stream URL for %s: %s", video_id, e)
            return None

    def prefetch(self, video_id: str):
        """Pre-resolve stream URL for the upcoming track in the background."""
        if not video_id:
            return

        with self._lock:
            if video_id in self._cache:
                return
            if video_id in self._pending_prefetches:
                return
            self._pending_prefetches.add(video_id)

        def _worker():
            try:
                logger.debug("Prefetching stream URL for upcoming track %s", video_id)
                self.resolve_stream_url(video_id)
            finally:
                with self._lock:
                    self._pending_prefetches.discard(video_id)

        self._executor.submit(_worker)


stream_resolver = StreamResolverService()

