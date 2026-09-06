import re
import shutil
import subprocess
import logging
from backend.app.config import settings

logger = logging.getLogger(__name__)

class AudioMixerService:
    """Manages ALSA hardware master volume (e.g. Raspberry Pi 3.5mm jack)."""

    def __init__(self):
        self.control = settings.ALSA_CONTROL
        self.card = settings.ALSA_CARD
        self.amixer_bin = shutil.which("amixer")
        self._cached_volume = 75

        if not self.amixer_bin:
            logger.warning("amixer binary not found. Hardware volume control will use simulation mode.")

    def set_volume(self, volume: int) -> int:
        """Set hardware ALSA volume percentage (0 to 100)."""
        volume = max(0, min(100, volume))
        self._cached_volume = volume

        if not self.amixer_bin:
            return self._cached_volume

        # Try setting volume on configured control and card
        cmd = [self.amixer_bin, "-q", "-c", self.card, "sset", self.control, f"{volume}%"]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            logger.info("Set ALSA volume on card %s [%s] to %d%%", self.card, self.control, volume)
        except Exception as e:
            logger.debug("Failed setting volume with specific card/control (%s), trying default: %s", cmd, e)
            # Fallback: try without explicit card/control specification or fallback to Master
            for fallback_cmd in [
                [self.amixer_bin, "-q", "sset", self.control, f"{volume}%"],
                [self.amixer_bin, "-q", "sset", "Master", f"{volume}%"],
                [self.amixer_bin, "-q", "sset", "PCM", f"{volume}%"],
            ]:
                try:
                    subprocess.run(fallback_cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                    logger.info("Set ALSA volume with fallback: %s", fallback_cmd)
                    break
                except Exception:
                    continue

        return self._cached_volume

    def get_volume(self) -> int:
        """Get current hardware ALSA volume percentage (0 to 100)."""
        if not self.amixer_bin:
            return self._cached_volume

        for cmd in [
            [self.amixer_bin, "-c", self.card, "sget", self.control],
            [self.amixer_bin, "sget", self.control],
            [self.amixer_bin, "sget", "Master"],
            [self.amixer_bin, "sget", "PCM"],
        ]:
            try:
                res = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                match = re.search(r"\[(\d+)%\]", res.stdout)
                if match:
                    self._cached_volume = int(match.group(1))
                    return self._cached_volume
            except Exception:
                continue

        return self._cached_volume

audio_mixer = AudioMixerService()

