import json
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional

from backend.app.config import settings

logger = logging.getLogger(__name__)

# Default frequency bands (Hz)
EQ_BANDS = [60, 250, 1000, 4000, 12000]

# Standard Presets
EQ_PRESETS: Dict[str, Dict[str, Any]] = {
    "flat": {
        "name": "Flat (Natural)",
        "gains": [0, 0, 0, 0, 0],
        "description": "Suara asli tanpa pewarnaan frekuensi"
    },
    "bass_boost": {
        "name": "Bass Booster",
        "gains": [6, 4, 0, 0, 1],
        "description": "Meningkatkan frekuensi rendah, sangat cocok untuk speaker mini USB"
    },
    "vocal_boost": {
        "name": "Vocal Clarity",
        "gains": [0, 1, 5, 2, 1],
        "description": "Menonjolkan vokal dan artikulasi lirik lagu agar lebih jelas"
    },
    "rock": {
        "name": "Rock / Energetic",
        "gains": [5, 2, -1, 3, 4],
        "description": "Profil kurva V-Shape untuk ketukan drum dan gitar yang dinamis"
    },
    "electronic": {
        "name": "Electronic / Dance",
        "gains": [6, 4, 0, 2, 5],
        "description": "Bass bertenaga dengan treble yang renyah"
    },
    "warm_night": {
        "name": "Warm / Night Mode",
        "gains": [2, 2, 1, -2, -4],
        "description": "Treble halus dan hangat, nyaman didengar sebelum tidur"
    },
}

class EqualizerService:
    """Manages audio equalizer, dynamic normalizer, and audio filter pipeline."""

    def __init__(self):
        self.config_path = settings.DATA_DIR / "equalizer.json"
        self.state: Dict[str, Any] = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        """Load equalizer state from persistent JSON file or return defaults."""
        default_state = {
            "preset": "bass_boost",  # Default to bass_boost for mini speakers
            "bands": [
                {"frequency": 60, "gain": 6},
                {"frequency": 250, "gain": 4},
                {"frequency": 1000, "gain": 0},
                {"frequency": 4000, "gain": 0},
                {"frequency": 12000, "gain": 1},
            ],
            "normalizer_enabled": True,  # Default to true to prevent clipping/distortion
            "stereo_widen": False,
        }

        if self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                    if isinstance(saved, dict) and "bands" in saved:
                        return saved
            except Exception as e:
                logger.error("Failed to load equalizer.json: %s", e)

        return default_state

    def _save_state(self):
        """Persist current state to JSON."""
        try:
            settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            logger.error("Failed to save equalizer.json: %s", e)

    def get_state(self) -> Dict[str, Any]:
        """Get current equalizer configuration and available presets."""
        return {
            "preset": self.state.get("preset", "custom"),
            "bands": self.state.get("bands", []),
            "normalizer_enabled": self.state.get("normalizer_enabled", True),
            "stereo_widen": self.state.get("stereo_widen", False),
            "available_presets": {
                k: {"name": v["name"], "description": v["description"]}
                for k, v in EQ_PRESETS.items()
            }
        }

    def build_filter_string(self) -> str:
        """Compile mpv lavfi filter string from current settings."""
        filters = []

        # 1. 5-Band Equalizer using FFmpeg peaking filters
        bands = self.state.get("bands", [])
        for b in bands:
            freq = b.get("frequency", 1000)
            gain = max(-12, min(12, b.get("gain", 0)))
            if gain != 0:
                filters.append(f"equalizer=f={freq}:t=q:w=1:g={gain}")

        # 2. Dynamic Audio Normalizer (prevents clipping, levels uneven tracks)
        if self.state.get("normalizer_enabled", True):
            filters.append("dynaudnorm=f=150:g=15:m=10")

        # 3. Stereo Widener / Enhancer
        if self.state.get("stereo_widen", False):
            filters.append("stereowiden")

        if not filters:
            return ""

        return f"lavfi=[{','.join(filters)}]"

    def apply_to_mpv(self, mpv_player) -> bool:
        """Send compiled filter string to mpv IPC socket."""
        filter_str = self.build_filter_string()
        logger.info("Applying mpv audio filter: %s", filter_str or "none")
        res = mpv_player._send_command(["set_property", "af", filter_str])
        return res is not None

    def set_preset(self, preset_name: str, mpv_player) -> Dict[str, Any]:
        """Apply a named preset."""
        if preset_name not in EQ_PRESETS:
            raise ValueError(f"Unknown preset: {preset_name}")

        preset = EQ_PRESETS[preset_name]
        gains = preset["gains"]
        self.state["preset"] = preset_name
        self.state["bands"] = [
            {"frequency": freq, "gain": gains[i]}
            for i, freq in enumerate(EQ_BANDS)
        ]
        self._save_state()
        self.apply_to_mpv(mpv_player)
        return self.get_state()

    def update_settings(
        self,
        bands: Optional[List[Dict[str, Any]]],
        normalizer_enabled: Optional[bool],
        stereo_widen: Optional[bool],
        mpv_player
    ) -> Dict[str, Any]:
        """Update custom equalizer settings."""
        if bands is not None:
            self.state["bands"] = bands
            # Check if bands match any known preset
            matched_preset = "custom"
            current_gains = [b.get("gain", 0) for b in bands]
            for p_name, p_data in EQ_PRESETS.items():
                if p_data["gains"] == current_gains:
                    matched_preset = p_name
                    break
            self.state["preset"] = matched_preset

        if normalizer_enabled is not None:
            self.state["normalizer_enabled"] = normalizer_enabled

        if stereo_widen is not None:
            self.state["stereo_widen"] = stereo_widen

        self._save_state()
        self.apply_to_mpv(mpv_player)
        return self.get_state()

equalizer_service = EqualizerService()
