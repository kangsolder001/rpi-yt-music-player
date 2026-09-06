import os
import json
import socket
import shutil
import asyncio
import logging
import subprocess
from typing import Optional, Dict, Any, List
from backend.app.config import settings
from backend.app.schemas import PlayerState, TrackInfo
from backend.app.services.audio_mixer import audio_mixer
from backend.app.services.downloader import downloader_service

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

        # Simulation mode fallback
        self.simulated = not bool(self.mpv_bin)
        if self.simulated:
            logger.warning("mpv binary not found on host! Running player in simulated mode.")

    def start_mpv_daemon(self):
        """Ensure mpv process is running with IPC socket enabled."""
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
            "--volume=100",  # Always keep player volume at max; control volume via ALSA
            "--ytdl-format=bestaudio/best",
            "--ytdl-raw-options=extractor-args=youtube:player_client=android",
            "--cache-pause-initial=no",
            "--demuxer-lavf-analyzeduration=0.5",
            "--demuxer-lavf-probesize=32768",
            "--gapless-audio=yes",
        ]

        if settings.MPV_AUDIO_DEVICE != "auto":
            cmd.append(f"--audio-device={settings.MPV_AUDIO_DEVICE}")

        mpv_log_path = settings.DATA_DIR / "mpv.log"
        self._mpv_log_file = open(mpv_log_path, "a")

        try:
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

    def _send_command(self, cmd: List[Any]) -> Optional[Dict[str, Any]]:
        """Send JSON command to MPV IPC socket."""
        if self.simulated:
            return None

        if not os.path.exists(self.socket_path):
            return None

        try:
            client = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            client.settimeout(1.5)
            client.connect(self.socket_path)
            payload = json.dumps({"command": cmd}) + "\n"
            client.sendall(payload.encode("utf-8"))
            
            response_data = b""
            while True:
                chunk = client.recv(4096)
                if not chunk:
                    break
                response_data += chunk
                if b"\n" in chunk:
                    break
            client.close()

            if response_data:
                return json.loads(response_data.decode("utf-8").strip().split("\n")[0])
        except Exception as e:
            logger.debug("MPV IPC send error for %s: %s", cmd, e)

        return None

    def set_repeat_mode(self, mode: str):
        """Set repeat mode: 'off', 'all', 'one'."""
        if mode in ("off", "all", "one"):
            self.repeat_mode = mode
            logger.info("Repeat mode set to: %s", mode)

    def play_song(self, video_id: str, title: str, artist: str = "", thumbnail_url: str = "", duration: int = 0, playlist_id: Optional[int] = None):
        """Play a single song immediately (offline from disk if downloaded, else streaming)."""
        local_file = downloader_service.get_local_file_path(video_id)
        if local_file:
            playback_target = local_file
            logger.info("Playing offline (local file): %s (%s)", title, local_file)
        else:
            playback_target = f"https://www.youtube.com/watch?v={video_id}"
            logger.info("Streaming from YouTube: %s (%s)", title, video_id)

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

        if not self.simulated:
            self._send_command(["loadfile", playback_target, "replace"])

    def play_playlist(self, songs: List[Dict[str, Any]], playlist_id: int, start_index: int = 0):
        """Load and start playback of a full playlist."""
        if not songs:
            return

        self._queue = songs
        self._queue_index = max(0, min(len(songs) - 1, start_index))
        self._current_playlist_id = playlist_id

        first_song = self._queue[self._queue_index]
        self.play_song(
            video_id=first_song["video_id"],
            title=first_song.get("title", ""),
            artist=first_song.get("artist", ""),
            thumbnail_url=first_song.get("thumbnail_url"),
            duration=first_song.get("duration", 0),
            playlist_id=playlist_id
        )

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
        """Skip to next track in queue or playlist, considering repeat mode."""
        # Single track repeat when triggered naturally by song ending
        if self.repeat_mode == "one" and not force_next and self._current_track and self._current_track.video_id:
            self.play_song(
                video_id=self._current_track.video_id,
                title=self._current_track.title,
                artist=self._current_track.artist,
                thumbnail_url=self._current_track.thumbnail_url,
                duration=int(self._current_track.duration),
                playlist_id=self._current_playlist_id
            )
            return

        if self._queue and self._queue_index + 1 < len(self._queue):
            self._queue_index += 1
            song = self._queue[self._queue_index]
            self.play_song(
                video_id=song["video_id"],
                title=song.get("title", ""),
                artist=song.get("artist", ""),
                thumbnail_url=song.get("thumbnail_url"),
                duration=song.get("duration", 0),
                playlist_id=self._current_playlist_id
            )
        elif self.repeat_mode == "all" and self._queue:
            # Loop back to beginning of playlist
            self._queue_index = 0
            song = self._queue[self._queue_index]
            self.play_song(
                video_id=song["video_id"],
                title=song.get("title", ""),
                artist=song.get("artist", ""),
                thumbnail_url=song.get("thumbnail_url"),
                duration=song.get("duration", 0),
                playlist_id=self._current_playlist_id
            )
        else:
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
                playlist_id=self._current_playlist_id
            )
        else:
            self.seek(0)

    def seek(self, position_seconds: float):
        """Seek to position in seconds."""
        self._current_time = max(0.0, position_seconds)
        if not self.simulated:
            self._send_command(["seek", self._current_time, "absolute"])

    def update_status_from_mpv(self):
        """Query MPV for live playback properties."""
        if self.simulated:
            # Simulated progress update
            if not self._is_idle and not self._is_paused:
                self._current_time += 1.0
                if self._duration > 0 and self._current_time >= self._duration:
                    self.next_track(force_next=False)
            return

        # Query time-pos
        pos_res = self._send_command(["get_property", "time-pos"])
        if pos_res and "data" in pos_res and isinstance(pos_res["data"], (int, float)):
            self._current_time = float(pos_res["data"])

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

        # Query idle state
        idle_res = self._send_command(["get_property", "idle-active"])
        if idle_res and "data" in idle_res:
            was_playing = not self._is_idle
            self._is_idle = bool(idle_res["data"])
            # If it just became idle, auto advance to next track
            if was_playing and self._is_idle:
                self.next_track(force_next=False)

    def get_state(self) -> PlayerState:
        """Get current player state combined with ALSA volume."""
        return PlayerState(
            is_playing=(not self._is_idle and not self._is_paused),
            is_paused=self._is_paused,
            is_idle=self._is_idle,
            current_time=round(self._current_time, 1),
            duration=round(self._duration, 1),
            volume=audio_mixer.get_volume(),
            repeat_mode=self.repeat_mode,
            current_track=self._current_track,
            playlist_id=self._current_playlist_id,
            queue_length=len(self._queue)
        )

    def shutdown(self):
        """Terminate MPV daemon."""
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=2)
            except Exception:
                self.process.kill()

player_service = MPVPlayerService()

