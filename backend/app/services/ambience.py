import os
from pathlib import Path
from typing import List, Dict, Optional, Any

class AmbienceService:
    """Manages curated nature soundscapes and white/pink/brown noise."""

    def __init__(self):
        # Assets directory relative to this service file
        self.assets_dir = Path(__file__).resolve().parent.parent / "assets" / "ambience"

        self.catalog: List[Dict[str, Any]] = [
            {
                "id": "heavy_rain_thunder",
                "title": "Heavy Rain & Distant Thunder",
                "title_id": "Hujan Deras & Gemuruh Petir",
                "category": "rain",
                "icon": "CloudRain",
                "gradient": "from-indigo-600 to-slate-950",
                "accent_color": "#6366f1",
                "description": "Suara gemuruh hujan lebat dan kilat petir kejauhan untuk tidur lelap.",
                "filename": "heavy_rain_thunder.mp3",
                "tags": ["hujan", "petir", "tidur", "sleep", "storm"]
            },
            {
                "id": "gentle_rain_window",
                "title": "Gentle Rain on Window",
                "title_id": "Hujan Rintik di Kaca Jendela",
                "category": "rain",
                "icon": "Droplets",
                "gradient": "from-cyan-600 to-slate-950",
                "accent_color": "#06b6d4",
                "description": "Rintik gerimis yang menenangkan menyentuh kaca jendela kamar.",
                "filename": "gentle_rain_window.mp3",
                "tags": ["gerimis", "jendela", "santai", "relax", "rain"]
            },
            {
                "id": "ocean_waves",
                "title": "Calm Ocean Waves",
                "title_id": "Deburan Ombak Pantai",
                "category": "nature",
                "icon": "Waves",
                "gradient": "from-teal-600 to-blue-950",
                "accent_color": "#0d9488",
                "description": "Irama pasang surut deburan ombak pantai yang ritmis dan menyejukkan.",
                "filename": "ocean_waves.mp3",
                "tags": ["pantai", "laut", "ombak", "meditasi", "ocean"]
            },
            {
                "id": "campfire",
                "title": "Cozy Crackling Campfire",
                "title_id": "Kresek Api Unggun Hangat",
                "category": "nature",
                "icon": "Flame",
                "gradient": "from-amber-600 to-stone-950",
                "accent_color": "#d97706",
                "description": "Suara kayu bakar berderak hangat dan letupan bara api di malam hari.",
                "filename": "campfire.mp3",
                "tags": ["api", "unggun", "hangat", "perapian", "fire"]
            },
            {
                "id": "night_forest",
                "title": "Night Forest & Crickets",
                "title_id": "Malam Hening & Suara Jangkrik",
                "category": "nature",
                "icon": "MoonStar",
                "gradient": "from-emerald-700 to-zinc-950",
                "accent_color": "#059669",
                "description": "Suasana malam sejuk pedesaan dan hutan dengan dering jangkrik alami.",
                "filename": "night_forest.mp3",
                "tags": ["jangkrik", "malam", "hutan", "desa", "crickets"]
            },
            {
                "id": "wind_trees",
                "title": "Mountain Wind in Pines",
                "title_id": "Deru Angin Dingin Gunung",
                "category": "nature",
                "icon": "Wind",
                "gradient": "from-sky-700 to-slate-950",
                "accent_color": "#0284c7",
                "description": "Hembusan angin sepoi-sepoi melewati ranting pepohonan pinus.",
                "filename": "wind.mp3",
                "tags": ["angin", "gunung", "sejuk", "wind"]
            },
            {
                "id": "cafe",
                "title": "Cozy Rainy Cafe",
                "title_id": "Kafe Santai & Hujan",
                "category": "places",
                "icon": "Coffee",
                "gradient": "from-yellow-700 to-stone-950",
                "accent_color": "#ca8a04",
                "description": "Dengung hangat kedai kopi diiringi gemercik hujan gerimis luar ruangan.",
                "filename": "cafe.mp3",
                "tags": ["kafe", "kopi", "fokus", "kerja", "cafe"]
            },
            {
                "id": "deep_brown_noise",
                "title": "Deep Sleep Brown Noise",
                "title_id": "Deep Brown Noise (Peredam Bising)",
                "category": "noise",
                "icon": "Headphones",
                "gradient": "from-orange-800 to-neutral-950",
                "accent_color": "#9a3412",
                "description": "Noise frekuensi rendah mirip dengung kabin pesawat / air terjun untuk deep sleep.",
                "filename": "brown_noise.mp3",
                "tags": ["brown noise", "tidur lelap", "adhd", "deep sleep", "noise"]
            },
            {
                "id": "focus_pink_noise",
                "title": "Focus & Relax Pink Noise",
                "title_id": "Pink Noise (Fokus & Belajar)",
                "category": "noise",
                "icon": "Sparkles",
                "gradient": "from-pink-700 to-rose-950",
                "accent_color": "#be185d",
                "description": "Frekuensi seimbang dan lembut untuk konsentrasi belajar dan menenangkan pikiran.",
                "filename": "pink_noise.mp3",
                "tags": ["pink noise", "fokus", "belajar", "study", "relax"]
            },
            {
                "id": "pure_white_noise",
                "title": "Pure White Noise",
                "title_id": "Pure White Noise (Blokir Suara Luar)",
                "category": "noise",
                "icon": "Volume2",
                "gradient": "from-zinc-600 to-zinc-950",
                "accent_color": "#71717a",
                "description": "Spektrum statis penuh untuk menutupi suara mendadak di luar ruangan.",
                "filename": "white_noise.mp3",
                "tags": ["white noise", "statis", "fokus", "block noise"]
            },
            {
                "id": "soothing_harp_lullaby",
                "title": "Soothing Sleep Harp Lullaby",
                "title_id": "Petikan Harpa Pengantar Tidur",
                "category": "lullaby",
                "icon": "Sparkles",
                "gradient": "from-teal-700 to-indigo-950",
                "accent_color": "#14b8a6",
                "description": "Alunan dawai harpa yang sangat lembut, hangat, dan mengalun tenang untuk tidur lelap.",
                "filename": "soothing_harp_lullaby.m4a",
                "tags": ["harp", "harpa", "lullaby", "lembut", "tidur", "sleep", "soothing"]
            },
            {
                "id": "soft_guitar_lullaby",
                "title": "Soft Bedtime Guitar",
                "title_id": "Gitar Akustik Lembut Pengantar Tidur",
                "category": "lullaby",
                "icon": "Music",
                "gradient": "from-amber-700 to-stone-950",
                "accent_color": "#d97706",
                "description": "Petikan gitar akustik yang lambat, hening, dan hangat untuk relaksasi malam hari.",
                "filename": "soft_guitar_lullaby.m4a",
                "tags": ["guitar", "gitar", "akustik", "lullaby", "lembut", "sleep", "bedtime"]
            },
            {
                "id": "piano_lullaby",
                "title": "Peaceful Sleep Piano (Satie)",
                "title_id": "Alunan Piano Damai (Gymnopédie)",
                "category": "lullaby",
                "icon": "Music",
                "gradient": "from-rose-600 to-indigo-950",
                "accent_color": "#f43f5e",
                "description": "Petikan piano lambat yang damai dan melankolis untuk tidur nyenyak.",
                "filename": "piano_lullaby.mp3",
                "tags": ["piano", "lullaby", "satie", "tidur", "klasik", "peaceful"]
            },
            {
                "id": "lullaby_rain",
                "title": "Music Box in Soft Rain",
                "title_id": "Kotak Musik & Hujan Rintik",
                "category": "lullaby",
                "icon": "Heart",
                "gradient": "from-violet-700 to-slate-950",
                "accent_color": "#8b5cf6",
                "description": "Perpaduan damai antara denting kotak musik dan suara rintik hujan gerimis.",
                "filename": "lullaby_rain.mp3",
                "tags": ["lullaby", "hujan", "kotak musik", "rain", "sleep", "calm"]
            },
            {
                "id": "music_box_lullaby",
                "title": "Brahms' Lullaby Music Box",
                "title_id": "Kotak Musik Klasik (Brahms)",
                "category": "lullaby",
                "icon": "Baby",
                "gradient": "from-purple-600 to-indigo-950",
                "accent_color": "#a855f7",
                "description": "Denting merdu kotak musik klasik tradisional pengantar tidur.",
                "filename": "music_box_lullaby.mp3",
                "tags": ["lullaby", "kotak musik", "music box", "tidur", "brahms", "baby"]
            }
        ]

    def get_catalog(self) -> List[Dict[str, Any]]:
        """Return all available soundscapes with availability check."""
        results = []
        for item in self.catalog:
            file_path = self.assets_dir / item["filename"]
            results.append({
                **item,
                "is_available": file_path.exists(),
                "file_size": file_path.stat().st_size if file_path.exists() else 0
            })
        return results

    def get_soundscape(self, soundscape_id: str) -> Optional[Dict[str, Any]]:
        """Find a soundscape by ID."""
        for item in self.catalog:
            if item["id"] == soundscape_id:
                return item
        return None

    def get_file_path(self, soundscape_id: str) -> Optional[Path]:
        """Get absolute path to soundscape audio file if it exists."""
        soundscape = self.get_soundscape(soundscape_id)
        if not soundscape:
            return None
        file_path = self.assets_dir / soundscape["filename"]
        return file_path if file_path.exists() else None

ambience_service = AmbienceService()

