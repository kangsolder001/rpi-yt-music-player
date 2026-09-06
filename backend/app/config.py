import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "RPi YouTube Music Player"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Project paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    ROOT_DIR: Path = BASE_DIR.parent
    DATA_DIR: Path = Path(os.getenv("DATA_DIR", str(ROOT_DIR / "data")))
    
    # Database (SQLite)
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'music.db'}")

    # MPV Player
    MPV_SOCKET_PATH: str = os.getenv("MPV_SOCKET_PATH", "/tmp/mpv-socket")
    MPV_AUDIO_DEVICE: str = os.getenv("MPV_AUDIO_DEVICE", "auto")

    # ALSA Hardware Mixer
    ALSA_CONTROL: str = os.getenv("ALSA_CONTROL", "Headphone")  # RPi 3.5mm jack is usually 'Headphone'
    ALSA_CARD: str = os.getenv("ALSA_CARD", "0")

    # Static files for frontend build
    STATIC_DIR: Path = Path(os.getenv("STATIC_DIR", str(ROOT_DIR / "frontend" / "dist")))

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure DATA_DIR exists
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)

