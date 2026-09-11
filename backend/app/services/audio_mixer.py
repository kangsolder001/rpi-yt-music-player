import re
import shutil
import subprocess
import logging
import time
from backend.app.config import settings

logger = logging.getLogger(__name__)

class AudioMixerService:
    """Manages ALSA hardware master volume (e.g. Raspberry Pi 3.5mm jack)."""

    def __init__(self):
        self.control = settings.ALSA_CONTROL
        self.card = settings.ALSA_CARD
        self.amixer_bin = shutil.which("amixer")
        self._cached_volume = 75
        self._last_read_time = 0.0
        self._cache_ttl = 3.0

        if not self.amixer_bin:
            logger.warning("amixer binary not found. Hardware volume control will use simulation mode.")

    def set_volume(self, volume: int) -> int:
        """Set hardware ALSA volume percentage (0 to 100)."""
        volume = max(0, min(100, volume))
        self._cached_volume = volume
        self._last_read_time = time.time()

        if not self.amixer_bin:
            return self._cached_volume

        # Try setting volume with -M (mapped volume for natural human ear response)
        cmd = [self.amixer_bin, "-M", "-q", "-c", self.card, "sset", self.control, f"{volume}%"]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            logger.info("Set ALSA volume (mapped) on card %s [%s] to %d%%", self.card, self.control, volume)
        except Exception as e:
            logger.debug("Failed setting volume with specific card/control (%s), trying fallback: %s", cmd, e)
            for fallback_cmd in [
                [self.amixer_bin, "-M", "-q", "sset", self.control, f"{volume}%"],
                [self.amixer_bin, "-M", "-q", "sset", "Master", f"{volume}%"],
                [self.amixer_bin, "-M", "-q", "sset", "PCM", f"{volume}%"],
                # Standard linear fallback if -M fails for any reason
                [self.amixer_bin, "-q", "-c", self.card, "sset", self.control, f"{volume}%"],
            ]:
                try:
                    subprocess.run(fallback_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    logger.info("Set ALSA volume with fallback: %s", fallback_cmd)
                    break
                except Exception:
                    continue

        return self._cached_volume

    def get_volume(self) -> int:
        """Get current hardware ALSA volume percentage (0 to 100) using mapped curve."""
        if not self.amixer_bin:
            return self._cached_volume

        now = time.time()
        if now - self._last_read_time < self._cache_ttl:
            return self._cached_volume

        for cmd in [
            [self.amixer_bin, "-M", "-c", self.card, "sget", self.control],
            [self.amixer_bin, "-M", "sget", self.control],
            [self.amixer_bin, "-M", "sget", "Master"],
            [self.amixer_bin, "-M", "sget", "PCM"],
            # Fallback without -M
            [self.amixer_bin, "-c", self.card, "sget", self.control],
        ]:
            try:
                res = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                match = re.search(r"\[(\d+)%\]", res.stdout)
                if match:
                    self._cached_volume = int(match.group(1))
                    self._last_read_time = now
                    return self._cached_volume
            except Exception:
                continue

        self._last_read_time = now
        return self._cached_volume

audio_mixer = AudioMixerService()

