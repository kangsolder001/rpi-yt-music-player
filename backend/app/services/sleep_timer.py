import time
import logging
import threading
from typing import Optional, Tuple

from backend.app.services.audio_mixer import audio_mixer

logger = logging.getLogger(__name__)


class SleepTimerService:
    """
    Manages sleep timer with smooth audio fade-out.
    Gradually scales ALSA volume to 0 over the final fade-out period,
    pauses playback, and restores original volume level for future sessions.
    """

    def __init__(self):
        self._is_active: bool = False
        self._target_timestamp: float = 0.0
        self._initial_minutes: int = 0
        self._initial_volume: int = 75
        self._fade_out_seconds: int = 60
        self._is_fading: bool = False
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def get_status(self) -> Tuple[bool, Optional[int]]:
        """Return (is_active, remaining_seconds)."""
        with self._lock:
            if not self._is_active:
                return False, None
            remaining = int(max(0, self._target_timestamp - time.time()))
            return True, remaining

    def start_timer(self, minutes: int, fade_out_seconds: int = 60):
        """Start or overwrite sleep timer with specified duration in minutes."""
        with self._lock:
            self._stop_event.set()

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)

        with self._lock:
            current_vol = audio_mixer.get_volume()
            # If not already in fading process, remember volume to restore later
            if not self._is_fading:
                self._initial_volume = current_vol if current_vol > 0 else 75

            self._initial_minutes = minutes
            self._target_timestamp = time.time() + (minutes * 60)
            self._fade_out_seconds = min(fade_out_seconds, minutes * 60)
            self._is_active = True
            self._is_fading = False
            self._stop_event.clear()

            self._thread = threading.Thread(
                target=self._run_loop,
                name="SleepTimerThread",
                daemon=True
            )
            self._thread.start()
            logger.info("Sleep timer started for %d minutes (Fade-out: %ds, Initial Vol: %d%%)",
                        minutes, self._fade_out_seconds, self._initial_volume)

    def cancel_timer(self):
        """Cancel sleep timer and restore original volume if fading."""
        with self._lock:
            if not self._is_active:
                return
            self._is_active = False
            self._stop_event.set()
            if self._is_fading:
                audio_mixer.set_volume(self._initial_volume)
                self._is_fading = False
            logger.info("Sleep timer cancelled. Volume restored to %d%%", self._initial_volume)

    def _run_loop(self):
        """Main timer worker loop ticking every second."""
        while not self._stop_event.is_set():
            now = time.time()
            with self._lock:
                if not self._is_active:
                    break
                remaining = self._target_timestamp - now

            if remaining <= 0:
                self._execute_sleep()
                break

            # Handle smooth fade-out during the final seconds
            with self._lock:
                fade_duration = self._fade_out_seconds
                init_vol = self._initial_volume

            if remaining <= fade_duration and remaining > 0:
                self._is_fading = True
                # Linear fade down: vol = init_vol * (remaining / fade_duration)
                fade_ratio = max(0.0, min(1.0, remaining / float(fade_duration)))
                target_vol = int(round(init_vol * fade_ratio))
                current_vol = audio_mixer.get_volume()
                if abs(current_vol - target_vol) >= 2 or target_vol == 0:
                    audio_mixer.set_volume(target_vol)
                    logger.debug("Sleep timer fade-out: %ds left -> Volume %d%%", int(remaining), target_vol)

            self._stop_event.wait(timeout=1.0)

    def _execute_sleep(self):
        """Called when sleep timer expires."""
        logger.info("Sleep timer expired! Executing smooth sleep and pausing player...")
        with self._lock:
            self._is_active = False
            init_vol = self._initial_volume
            self._is_fading = False

        # 1. Ensure volume is at 0 briefly to avoid clicks
        audio_mixer.set_volume(0)

        # 2. Pause the player
        try:
            from backend.app.services.mpv_player import player_service
            player_service.pause()
            logger.info("Player paused by sleep timer.")
        except Exception as e:
            logger.error("Failed to pause player on sleep timer: %s", e)

        # 3. Restore original volume so user doesn't find player muted next time
        time.sleep(0.5)
        audio_mixer.set_volume(init_vol)
        logger.info("Restored hardware volume to %d%% after sleep pause.", init_vol)

        # 4. Broadcast updated state to all connected clients
        try:
            import asyncio
            from backend.app.routers.player import ws_manager
            # ws_manager broadcast via event loop if available
            loop = None
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                pass

            if loop and loop.is_running():
                asyncio.run_coroutine_threadsafe(ws_manager.broadcast_state(), loop)
        except Exception:
            pass


sleep_timer_service = SleepTimerService()

