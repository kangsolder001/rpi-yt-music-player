import os
import json
import time
import socket
import shutil
import asyncio
import logging
import threading
import subprocess
from typing import Optional, Dict, Any, List
from concurrent.futures import ThreadPoolExecutor

from backend.app.config import settings
from backend.app.schemas import PlayerState, TrackInfo
from backend.app.services.audio_mixer import audio_mixer
from backend.app.services.downloader import downloader_service
from backend.app.services.ytmusic import ytmusic_service
from backend.app.services.stream_resolver import stream_resolver
from backend.app.services.sleep_timer import sleep_timer_service

logger = logging.getLogger(__name__)

class MPVPlayerService:
    """Manages MPV audio daemon via Unix IPC Socket."""

    def __init__(self):
        self.socket_path = settings.MPV_SOCKET_PATH
        self.process: Optional[subprocess.Popen] = None
        self.mpv_bin = shutil.which("mpv")
        
        # Internal state
        self._current_track: Optional[TrackInfo] = None
        self._current_playlist_id: Optional[int] = None
        self._queue: List[Dict[str, Any]] = []
        self._queue_index: int = 0
        self._is_paused: bool = False
        self._is_idle: bool = True
        self._current_time: float = 0.0
        self._duration: float = 0.0
        self.repeat_mode: str = "off"  # "off", "all", "one"
        self.autoplay: bool = True  # Auto-play similar recommended tracks
        self._last_play_time: float = 0.0
        self._executor = ThreadPoolExecutor(max_workers=2)
        self._fetching_autoplay: bool = False
        self._mpv_log_file = None

        # Persistent IPC socket & health watchdog
        self._ipc_socket: Optional[socket.socket] = None
        self._ipc_file = None
        self._ipc_lock = threading.Lock()
        self._ipc_req_id: int = 0
        self._consecutive_failures: int = 0
        self._last_stall_check_time: float = time.time()
        self._stall_detected_count: int = 0

        # Simulation mode fallback
        self.simulated = not bool(self.mpv_bin)
        if self.simulated:
            logger.warning("mpv binary not found on host! Running player in simulated mode.")

    def start_mpv_daemon(self):
        """Ensure mpv process is running with IPC socket enabled and rock-solid ALSA buffering."""
        if self.simulated:
            return

        # Clean old socket if exists
        if os.path.exists(self.socket_path):
            try:
                os.remove(self.socket_path)
            except OSError:
                pass

        cmd = [
            self.mpv_bin,
            "--idle=yes",
            f"--input-ipc-server={self.socket_path}",
            "--no-video",
            "--ao=alsa",
            "--audio-buffer=0.5",           # 500ms buffer (safe against ALSA underruns, 2x faster than 1s)
            "--audio-format=s16",           # Native 16-bit PCM for bcm2835 headphone DAC
            "--volume=100",                 # Always keep player volume at max; control volume via ALSA
            "--ytdl-format=bestaudio/best",
            "--ytdl-raw-options=extractor-args=youtube:player_client=android",
            "--cache=yes",
            "--demuxer-max-bytes=32MiB",
            "--demuxer-max-back-bytes=16MiB",
            "--cache-pause-initial=no",
            "--demuxer-lavf-analyzeduration=0.1",
            "--demuxer-lavf-probesize=32768",
            "--gapless-audio=yes",
            "--term-status-msg=",           # Prevent 10x/sec progress line spam to log file
            "--msg-level=all=warn,ipc=error",
        ]

        if settings.MPV_AUDIO_DEVICE != "auto":
            cmd.append(f"--audio-device={settings.MPV_AUDIO_DEVICE}")

        mpv_log_path = settings.DATA_DIR / "mpv.log"
        # Rotate log if exceeds 2MB to protect storage
        if mpv_log_path.exists():
            try:
                if mpv_log_path.stat().st_size > 2 * 1024 * 1024:
                    backup = mpv_log_path.with_suffix(".log.old")
                    if backup.exists():
                        backup.unlink()
                    mpv_log_path.rename(backup)
            except Exception as e:
                logger.warning("Failed rotating mpv.log: %s", e)

        try:
            self._mpv_log_file = open(mpv_log_path, "a")
            self.process = subprocess.Popen(
                cmd,
                stdout=self._mpv_log_file,
                stderr=subprocess.STDOUT,
                stdin=subprocess.DEVNULL,
                start_new_session=True
            )
            logger.info("Started MPV daemon with PID %s (Socket: %s, Device: %s)", self.process.pid, self.socket_path, settings.MPV_AUDIO_DEVICE)
        except Exception as e:
            logger.error("Failed to start MPV process: %s. Falling back to simulated mode.", e)
            self.simulated = True

    def _close_socket(self):
        """Close persistent IPC socket cleanly."""
        if self._ipc_file is not None:
            try:
                self._ipc_file.close()
            except Exception:
                pass
            self._ipc_file = None

        if self._ipc_socket is not None:
            try:
                self._ipc_socket.close()
            except Exception:
                pass
            self._ipc_socket = None

    def _get_socket(self) -> Optional[socket.socket]:
        """Return persistent UNIX socket connection to MPV IPC or connect a new one."""
        if self._ipc_socket is not None:
            return self._ipc_socket

        if not os.path.exists(self.socket_path):
            return None

        try:
            client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            client.settimeout(2.0)
            client.connect(self.socket_path)
            self._ipc_socket = client
            self._ipc_file = client.makefile("r", encoding="utf-8", errors="ignore")
            return self._ipc_socket
        except Exception as e:
            logger.debug("Failed connecting to MPV IPC socket (%s): %s", self.socket_path, e)
            self._close_socket()
            return None

    def _send_command(self, cmd: List[Any]) -> Optional[Dict[str, Any]]:
        """Send JSON command to MPV IPC socket using persistent connection with automatic retry."""
        if self.simulated:
            return None

        with self._ipc_lock:
            for attempt in range(2):
                sock = self._get_socket()
                if not sock or not self._ipc_file:
                    continue

                try:
                    self._ipc_req_id += 1
                    req_id = self._ipc_req_id
                    payload = json.dumps({"command": cmd, "request_id": req_id}) + "\n"
                    sock.sendall(payload.encode("utf-8"))

                    # Read responses line-by-line until matching request_id or command response is found
                    while True:
                        line = self._ipc_file.readline()
                        if not line:
                            raise ConnectionError("MPV IPC socket connection closed by peer")

                        line = line.strip()
                        if not line:
                            continue

                        try:
                            parsed = json.loads(line)
                            if parsed.get("request_id") == req_id:
                                self._consecutive_failures = 0
                                return parsed
                            elif "error" in parsed and "event" not in parsed:
                                self._consecutive_failures = 0
                                return parsed
                        except json.JSONDecodeError:
                            continue

                except Exception as e:
                    logger.debug("MPV IPC send error on attempt %d for %s: %s", attempt, cmd, e)
                    self._close_socket()
                    if attempt == 1:
                        self._consecutive_failures += 1
                        if self._consecutive_failures >= 6:
                            logger.warning("MPV IPC socket failed %d consecutive times! Triggering auto-recovery...", self._consecutive_failures)
                            self._trigger_watchdog_recovery()
                        return None

        return None

    def restart_engine(self) -> PlayerState:
        """Cleanly restart MPV daemon, re-initialize ALSA audio, and resume playback without rebooting."""
        logger.warning("Executing audio engine restart...")
        was_playing = (not self._is_idle and not self._is_paused)
        saved_track = self._current_track
        saved_time = self._current_time
        saved_playlist_id = self._current_playlist_id
        saved_queue = list(self._queue)
        saved_queue_index = self._queue_index

        self._close_socket()

        # Terminate old process
        if self.process:
            try:
                self.process.terminate()
                self.process.wait(timeout=2.0)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
            self.process = None

        # Clean old socket file
        if os.path.exists(self.socket_path):
            try:
                os.remove(self.socket_path)
            except OSError:
                pass

        # Close old log file
        if self._mpv_log_file:
            try:
                self._mpv_log_file.close()
            except Exception:
                pass
            self._mpv_log_file = None

        # Start fresh MPV daemon
        self.start_mpv_daemon()
        time.sleep(0.4)

        # Re-apply equalizer
        try:
            from backend.app.services.equalizer import equalizer_service
            equalizer_service.apply_to_mpv(self)
        except Exception as e:
            logger.error("Failed to re-apply equalizer on restart: %s", e)

        # Restore queue and track info
        self._queue = saved_queue
        self._queue_index = saved_queue_index
        self._current_playlist_id = saved_playlist_id
        self._consecutive_failures = 0
        self._stall_detected_count = 0

        if was_playing and saved_track and saved_track.video_id:
            logger.info("Resuming track '%s' (saved pos: %.1fs) after engine restart", saved_track.title, saved_time)
            self.play_song(
                video_id=saved_track.video_id,
                title=saved_track.title,
                artist=saved_track.artist,
                thumbnail_url=saved_track.thumbnail_url,
                duration=int(saved_track.duration),
                playlist_id=saved_playlist_id,
                reset_queue=False
            )
            if saved_time > 5.0:
                time.sleep(0.5)
                self.seek(saved_time)

        logger.info("Audio engine restart completed successfully.")
        return self.get_state()

    def _trigger_watchdog_recovery(self):
        """Called by watchdog when MPV daemon is detected dead or unresponsive."""
        try:
            self.restart_engine()
        except Exception as e:
            logger.error("Watchdog auto-recovery failed: %s", e)

    def set_repeat_mode(self, mode: str):
        """Set repeat mode: 'off', 'all', 'one'."""
        if mode in ("off", "all", "one"):
            self.repeat_mode = mode
            if not self.simulated:
                self._send_command(["set_property", "loop-file", "inf" if mode == "one" else "no"])
            logger.info("Repeat mode set to: %s", mode)

    def set_autoplay(self, enabled: bool):
        """Enable or disable autoplay of similar recommended tracks."""
        self.autoplay = enabled
        logger.info("Autoplay set to: %s", enabled)

    def play_ambience(
        self,
        ambience_id: str,
        title: str,
        file_path: str,
        artist: str = "Ambience & Sleep",
        thumbnail_url: Optional[str] = None,
        duration: int = 0
    ):
        """Play a local ambient soundscape in seamless infinite loop."""
        logger.info("Playing local ambience soundscape: %s (%s)", title, file_path)
        self._current_track = TrackInfo(
            video_id=f"ambience_{ambience_id}",
            title=title,
            artist=artist,
            thumbnail_url=thumbnail_url,
            duration=float(duration)
        )
        self._current_playlist_id = None
        self._is_paused = False
        self._is_idle = False
        self._current_time = 0.0
        self._duration = float(duration)
        self._last_play_time = time.time()
        self.repeat_mode = "one"  # Repeat this track indefinitely

        self._queue = [{
            "video_id": f"ambience_{ambience_id}",
            "title": title,
            "artist": artist,
            "thumbnail_url": thumbnail_url,
            "duration": duration
        }]
        self._queue_index = 0

        if not self.simulated:
            self._send_command(["set_property", "pause", False])
            self._send_command(["set_property", "loop-file", "inf"])
            self._send_command(["loadfile", str(file_path), "replace"])
            self._send_command(["set_property", "pause", False])

    def play_song(
        self,
        video_id: str,
        title: str,
        artist: str = "",
        thumbnail_url: str = "",
        duration: int = 0,
        playlist_id: Optional[int] = None,
        reset_queue: bool = True
    ):
        """Play a single song immediately (offline from disk if downloaded, else streaming)."""
        local_file = downloader_service.get_local_file_path(video_id)
        if local_file:
            playback_target = local_file
            logger.info("Playing offline (local file): %s (%s)", title, local_file)
        else:
            # High-performance direct stream resolution with memory cache
            direct_url = stream_resolver.resolve_stream_url(video_id)
            if direct_url:
                playback_target = direct_url
                logger.info("Playing direct stream: %s (%s)", title, video_id)
            else:
                playback_target = f"https://www.youtube.com/watch?v={video_id}"
                logger.info("Streaming from YouTube (ytdl fallback): %s (%s)", title, video_id)

        self._current_track = TrackInfo(
            video_id=video_id,
            title=title or "Unknown Title",
            artist=artist or "Unknown Artist",
            thumbnail_url=thumbnail_url,
            duration=float(duration)
        )
        self._current_playlist_id = playlist_id
        self._is_paused = False
        self._is_idle = False
        self._current_time = 0.0
        self._duration = float(duration)
        self._last_play_time = time.time()

        if reset_queue:
            self._queue = [{
                "video_id": video_id,
                "title": title or "Unknown Title",
                "artist": artist or "Unknown Artist",
                "thumbnail_url": thumbnail_url,
                "duration": duration
            }]
            self._queue_index = 0

            # If autoplay is enabled and not in a playlist, queue up related tracks in background
            if self.autoplay and playlist_id is None:
                self._executor.submit(self._queue_related_tracks, video_id)

        if not self.simulated:
            self._send_command(["set_property", "loop-file", "inf" if self.repeat_mode == "one" else "no"])
            self._send_command(["set_property", "pause", False])
            self._send_command(["loadfile", playback_target, "replace"])
            self._send_command(["set_property", "pause", False])

        # Background prefetch the next track in queue if available
        next_idx = self._queue_index + 1
        if self._queue and next_idx < len(self._queue):
            next_track_info = self._queue[next_idx]
            if next_track_info and "video_id" in next_track_info:
                stream_resolver.prefetch(next_track_info["video_id"])

    def _queue_related_tracks(self, seed_video_id: str):
        """Fetch similar recommended tracks and append to radio queue."""
        if self._fetching_autoplay:
            return
        self._fetching_autoplay = True
        try:
            logger.info("Fetching related radio tracks for video ID: %s", seed_video_id)
            related = ytmusic_service.get_related_tracks(seed_video_id, limit=20)
            if not related:
                return

            existing_ids = {item["video_id"] for item in self._queue}
            new_tracks = []
            for track in related:
                if track.video_id not in existing_ids:
                    existing_ids.add(track.video_id)
                    new_tracks.append({
                        "video_id": track.video_id,
                        "title": track.title,
                        "artist": track.artist,
                        "thumbnail_url": track.thumbnail_url,
                        "duration": track.duration
                    })

            if new_tracks:
                self._queue.extend(new_tracks)
                logger.info("Appended %d related autoplay tracks to queue (Total: %d)", len(new_tracks), len(self._queue))
                # Prefetch first autoplay track in queue
                if len(self._queue) > self._queue_index + 1:
                    stream_resolver.prefetch(self._queue[self._queue_index + 1]["video_id"])
        except Exception as e:
            logger.error("Failed to fetch related autoplay tracks: %s", e)
        finally:
            self._fetching_autoplay = False

    def play_playlist(self, songs: List[Dict[str, Any]], playlist_id: int, start_index: int = 0):
        """Load and start playback of a full playlist."""
        if not songs:
            return

        self._queue = list(songs)
        self._queue_index = max(0, min(len(songs) - 1, start_index))
        self._current_playlist_id = playlist_id

        first_song = self._queue[self._queue_index]
        self.play_song(
            video_id=first_song["video_id"],
            title=first_song.get("title", ""),
            artist=first_song.get("artist", ""),
            thumbnail_url=first_song.get("thumbnail_url"),
            duration=first_song.get("duration", 0),
            playlist_id=playlist_id,
            reset_queue=False
        )

        # Prefetch the next track in playlist
        if len(self._queue) > self._queue_index + 1:
            stream_resolver.prefetch(self._queue[self._queue_index + 1]["video_id"])

    def pause(self):
        """Pause playback."""
        self._is_paused = True
        if not self.simulated:
            self._send_command(["set_property", "pause", True])

    def resume(self):
        """Resume playback."""
        self._is_paused = False
        if not self.simulated:
            self._send_command(["set_property", "pause", False])

    def toggle_play_pause(self):
        """Toggle play / pause."""
        if self._is_idle and self._current_track and self._current_track.video_id:
            self.play_song(
                video_id=self._current_track.video_id,
                title=self._current_track.title,
                artist=self._current_track.artist,
                thumbnail_url=self._current_track.thumbnail_url,
                duration=int(self._current_track.duration),
                playlist_id=self._current_playlist_id
            )
            return

        if self._is_paused:
            self.resume()
        else:
            self.pause()

    def stop(self):
        """Stop playback completely."""
        self._is_paused = False
        self._is_idle = True
        self._current_time = 0.0
        if not self.simulated:
            self._send_command(["stop"])

    def next_track(self, force_next: bool = True):
        """Skip to next track in queue or playlist, considering repeat mode and autoplay."""
        # 1. Single track repeat when triggered naturally by song ending
        if self.repeat_mode == "one" and not force_next and self._current_track and self._current_track.video_id:
            self.play_song(
                video_id=self._current_track.video_id,
                title=self._current_track.title,
                artist=self._current_track.artist,
                thumbnail_url=self._current_track.thumbnail_url,
                duration=int(self._current_track.duration),
                playlist_id=self._current_playlist_id,
                reset_queue=False
            )
            return

        # 2. Advance to next track in existing queue
        if self._queue and self._queue_index + 1 < len(self._queue):
            self._queue_index += 1
            song = self._queue[self._queue_index]
            self.play_song(
                video_id=song["video_id"],
                title=song.get("title", ""),
                artist=song.get("artist", ""),
                thumbnail_url=song.get("thumbnail_url"),
                duration=song.get("duration", 0),
                playlist_id=self._current_playlist_id,
                reset_queue=False
            )

            # If approaching end of queue and autoplay is enabled, prefetch more similar tracks
            if self.autoplay and (len(self._queue) - self._queue_index <= 3):
                self._executor.submit(self._queue_related_tracks, song["video_id"])
            return

        # 3. If in playlist and repeat_mode is 'all', loop to beginning of playlist
        if self._current_playlist_id and self.repeat_mode == "all" and self._queue:
            self._queue_index = 0
            song = self._queue[self._queue_index]
            self.play_song(
                video_id=song["video_id"],
                title=song.get("title", ""),
                artist=song.get("artist", ""),
                thumbnail_url=song.get("thumbnail_url"),
                duration=song.get("duration", 0),
                playlist_id=self._current_playlist_id,
                reset_queue=False
            )
            return

        # 4. If reached end of queue/playlist and autoplay is enabled: fetch related tracks and continue playing!
        if self.autoplay and self._current_track and self._current_track.video_id:
            logger.info("Queue ended. Autoplay finding similar songs for: %s", self._current_track.title)
            related = ytmusic_service.get_related_tracks(self._current_track.video_id, limit=15)
            existing_ids = {item["video_id"] for item in self._queue}
            new_tracks = [
                {
                    "video_id": t.video_id,
                    "title": t.title,
                    "artist": t.artist,
                    "thumbnail_url": t.thumbnail_url,
                    "duration": t.duration
                }
                for t in related if t.video_id not in existing_ids
            ]
            if new_tracks:
                start_idx = len(self._queue)
                self._queue.extend(new_tracks)
                self._queue_index = start_idx
                song = self._queue[self._queue_index]
                self.play_song(
                    video_id=song["video_id"],
                    title=song.get("title", ""),
                    artist=song.get("artist", ""),
                    thumbnail_url=song.get("thumbnail_url"),
                    duration=song.get("duration", 0),
                    playlist_id=None,
                    reset_queue=False
                )
                return

        # 5. Otherwise, stop playback
        self.stop()

    def previous_track(self):
        """Go to previous track in queue or restart current if > 3s."""
        if self._current_time > 3.0:
            self.seek(0)
            return

        if self._queue and self._queue_index > 0:
            self._queue_index -= 1
            song = self._queue[self._queue_index]
            self.play_song(
                video_id=song["video_id"],
                title=song.get("title", ""),
                artist=song.get("artist", ""),
                thumbnail_url=song.get("thumbnail_url"),
                duration=song.get("duration", 0),
                playlist_id=self._current_playlist_id,
                reset_queue=False
            )
        else:
            self.seek(0)

    def seek(self, position_seconds: float):
        """Seek to position in seconds."""
        self._current_time = max(0.0, position_seconds)
        if not self.simulated:
            self._send_command(["seek", self._current_time, "absolute"])

    def update_status_from_mpv(self):
        """Query MPV for live playback properties and monitor health."""
        if self.simulated:
            # Simulated progress update
            if not self._is_idle and not self._is_paused:
                self._current_time += 1.0
                if self._duration > 0 and self._current_time >= self._duration:
                    self.next_track(force_next=False)
            return

        # Watchdog 1: Check if MPV daemon process terminated unexpectedly
        if self.process and self.process.poll() is not None:
            logger.warning("MPV daemon process died (exit code: %s). Auto-restarting...", self.process.poll())
            self._trigger_watchdog_recovery()
            return

        # Query time-pos
        pos_res = self._send_command(["get_property", "time-pos"])
        if pos_res and "data" in pos_res and isinstance(pos_res["data"], (int, float)):
            self._current_time = float(pos_res["data"])
            if self._current_time > 0.0:
                self._stall_detected_count = 0

        # Query duration
        dur_res = self._send_command(["get_property", "duration"])
        if dur_res and "data" in dur_res and isinstance(dur_res["data"], (int, float)):
            self._duration = float(dur_res["data"])
            if self._current_track:
                self._current_track.duration = self._duration

        # Query pause state
        pause_res = self._send_command(["get_property", "pause"])
        if pause_res and "data" in pause_res:
            self._is_paused = bool(pause_res["data"])

        # Query idle and eof states
        idle_res = self._send_command(["get_property", "idle-active"])
        eof_res = self._send_command(["get_property", "eof-reached"])
        is_eof = bool(eof_res and eof_res.get("data") is True)

        if idle_res and "data" in idle_res:
            now_idle = bool(idle_res["data"])
            was_playing = not self._is_idle

            # Detect genuine track completion
            if (was_playing or is_eof) and (now_idle or is_eof):
                # Ensure it's not a false positive during initial stream startup (must be > 6s since play initiated)
                if (time.time() - self._last_play_time > 6.0) and (self._current_time > 5.0 or is_eof):
                    logger.info("Track finished naturally (duration: %s, pos: %s, EOF: %s). Advancing to next track.", self._duration, self._current_time, is_eof)
                    self._is_idle = True
                    self.next_track(force_next=False)
                    return

            # Avoid false idle during stream buffering startup
            if not (now_idle and (time.time() - self._last_play_time < 6.0)):
                self._is_idle = now_idle

        # Watchdog 2: Detect playback stall at 00:00:00 (>15s without advancement)
        now = time.time()
        if (
            not self._is_idle
            and not self._is_paused
            and self._current_track
            and (now - self._last_play_time > 15.0)
            and self._current_time == 0.0
            and (now - self._last_stall_check_time > 15.0)
        ):
            self._last_stall_check_time = now
            self._stall_detected_count += 1
            logger.warning("Playback stalled at 00:00:00 (stall count: %d). Sending unpause...", self._stall_detected_count)
            self._send_command(["set_property", "pause", False])
            if self._stall_detected_count >= 2:
                logger.warning("Playback remained stalled after unpause. Triggering engine recovery...")
                self._stall_detected_count = 0
                self._trigger_watchdog_recovery()

    def get_state(self) -> PlayerState:
        """Get current player state combined with ALSA volume and sleep timer."""
        timer_active, timer_remaining = sleep_timer_service.get_status()
        return PlayerState(
            is_playing=(not self._is_idle and not self._is_paused),
            is_paused=self._is_paused,
            is_idle=self._is_idle,
            current_time=round(self._current_time, 1),
            duration=round(self._duration, 1),
            volume=audio_mixer.get_volume(),
            repeat_mode=self.repeat_mode,
            autoplay=self.autoplay,
            current_track=self._current_track,
            playlist_id=self._current_playlist_id,
            queue_length=len(self._queue),
            is_sleep_timer_active=timer_active,
            sleep_timer_remaining=timer_remaining
        )

    def get_queue(self) -> Dict[str, Any]:
        """Get the current playback queue with current item indicator."""
        items = []
        for i, item in enumerate(self._queue):
            items.append({
                "index": i,
                "video_id": item.get("video_id", ""),
                "title": item.get("title", "Unknown Title"),
                "artist": item.get("artist", "Unknown Artist"),
                "thumbnail_url": item.get("thumbnail_url"),
                "duration": float(item.get("duration", 0)),
                "is_current": (i == self._queue_index)
            })
        return {
            "current_index": self._queue_index,
            "total": len(self._queue),
            "items": items
        }

    def play_queue_index(self, index: int):
        """Play a specific track in the existing queue by its index."""
        if not self._queue or index < 0 or index >= len(self._queue):
            return
        self._queue_index = index
        song = self._queue[self._queue_index]
        self.play_song(
            video_id=song["video_id"],
            title=song.get("title", ""),
            artist=song.get("artist", ""),
            thumbnail_url=song.get("thumbnail_url"),
            duration=song.get("duration", 0),
            playlist_id=self._current_playlist_id,
            reset_queue=False
        )

    def shutdown(self):
        """Clean shutdown of mpv process and persistent socket."""
        self._close_socket()
        if self.process and self.process.poll() is None:
            try:
                self.process.terminate()
                self.process.wait(timeout=2)
            except Exception:
                try:
                    self.process.kill()
                except Exception:
                    pass
        self.process = None

        if os.path.exists(self.socket_path):
            try:
                os.remove(self.socket_path)
            except OSError:
                pass

        if self._mpv_log_file:
            try:
                self._mpv_log_file.close()
            except Exception:
                pass
            self._mpv_log_file = None

player_service = MPVPlayerService()

