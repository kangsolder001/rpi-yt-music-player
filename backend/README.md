# 🐍 RPi YouTube Music Player - Backend

Backend service berbasis **FastAPI (Python 3.11)** yang mengontrol pemutaran audio di Raspberry Pi 4, mengelola database playlist lokal dengan **SQLite**, mengendalikan volume hardware melalui **ALSA (`amixer`)**, serta melakukan caching/download offline otomatis menggunakan **`yt-dlp`** dan **`mpv`**.

---

## 🏛️ Arsitektur & Layanan (Services)

Backend dirancang modular dengan pemisahan tanggung jawab yang jelas:

```text
backend/
├── app/
│   ├── config.py                 # Pydantic Settings & environment variables
│   ├── database.py               # SQLite SessionLocal & migrasi skema otomatis (PRAGMA)
│   ├── models.py                 # SQLAlchemy ORM Models (Playlist, PlaylistSong)
│   ├── schemas.py                # Pydantic Request/Response validation schemas
│   ├── websocket.py              # WebSocket ConnectionManager untuk broadcast state player
│   ├── services/
│   │   ├── mpv_player.py         # mpv daemon manager via UNIX JSON IPC socket
│   │   ├── downloader.py         # ThreadPool background downloader audio ke local disk
│   │   ├── audio_mixer.py        # Kontrol level hardware volume ALSA via amixer
│   │   └── ytmusic.py            # Pencarian YouTube Music & ekstraksi metadata video
│   ├── routers/
│   │   ├── player.py             # REST & WebSocket endpoint pemutaran lagu
│   │   ├── playlists.py          # REST endpoint CRUD playlist, lagu, & trigger download
│   │   └── search.py             # REST endpoint pencarian & parsing YouTube URL
│   └── main.py                   # Inisialisasi FastAPI, startup daemons, & static SPA server
├── tests/
│   └── test_api.py               # Unit & integration testing API
└── requirements.txt              # Daftar dependensi Python
```

---

## ⚙️ Komponen Utama

### 1. Audio Engine (`mpv` + IPC Socket)
- Pemutaran audio tidak membebani CPU/RAM karena dikendalikan langsung oleh proses `mpv` background daemon.
- Komunikasi dengan `mpv` dilakukan lewat UNIX Domain Socket (`/tmp/mpv-socket`) menggunakan format pesan JSON IPC.
- Mendukung fitur: `loadfile`, `pause`, `resume`, `seek`, `stop`, serta mode `repeat` (`off`, `all`, `one`).
- Player volume internal `mpv` dikunci pada 100% agar output audio dari DAC/jack 3.5mm selalu jernih dan bebas noise digital.

### 2. Hardware Volume Control (`ALSA / amixer`)
- Pengaturan volume di web UI langsung mengubah volume analog di sound card Raspberry Pi via command:
  ```bash
  amixer -c <CARD> sset <CONTROL> <PERCENT>%
  ```
- Di Raspberry Pi 4 (Debian 12 Bookworm / 13 Trixie), jack audio 3.5mm bcm2835 umumnya menggunakan **Card 2** dan control **PCM**.

### 3. Offline Caching & Downloader (`yt-dlp`)
- Lagu yang dimasukkan ke playlist otomatis diunduh secara asynchronous di latar belakang (thread pool) ke folder `/app/data/downloads/<video_id>.m4a`.
- Saat lagu diputar, player memprioritaskan file offline lokal. Jika file sudah terunduh, pemutaran berjalan instan (0s buffer) tanpa perlu koneksi internet.
- **Auto Disk Cleanup**: Menghapus lagu atau playlist secara otomatis menghapus file `.m4a` terkait dari disk jika file tersebut tidak digunakan di playlist lain manapun.

### 4. Real-time WebSocket Synchronization
- Endpoint `/api/player/ws` mengirimkan broadcast berkala (tiap 1 detik saat memutar) ke seluruh client web yang terhubung.
- Perubahan volume, posisi playback (detik), status play/pause, lagu aktif, dan mode repeat tersinkronisasi instan di semua tab/perangkat pengguna.

---

## 📡 Dokumentasi Endpoint REST API

### Player (`/api/player`)
| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/player/status` | Mendapatkan status pemutaran saat ini |
| `POST` | `/api/player/play` | Memutar trek (payload: `video_id`, `title`, `artist`, dsb.) |
| `POST` | `/api/player/pause` | Pause atau resume pemutaran |
| `POST` | `/api/player/stop` | Menghentikan pemutaran |
| `POST` | `/api/player/next` | Memutar lagu berikutnya dalam antrean |
| `POST` | `/api/player/previous` | Memutar lagu sebelumnya dalam antrean |
| `POST` | `/api/player/seek` | Melompat ke posisi detik tertentu (payload: `{"position": 45}`) |
| `POST` | `/api/player/volume` | Mengubah hardware volume ALSA (payload: `{"volume": 80}`) |
| `POST` | `/api/player/repeat` | Mengubah mode repeat (payload: `{"mode": "off" | "all" | "one"}`) |
| `WS` | `/api/player/ws` | WebSocket stream status real-time |

### Playlists (`/api/playlists`)
| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/playlists` | Menampilkan seluruh playlist |
| `POST` | `/api/playlists` | Membuat playlist baru |
| `GET` | `/api/playlists/{id}` | Detail playlist beserta seluruh lagunya |
| `PUT` | `/api/playlists/{id}` | Mengubah nama/deskripsi playlist |
| `DELETE` | `/api/playlists/{id}` | Menghapus playlist & membersihkan file lokal |
| `POST` | `/api/playlists/{id}/songs` | Menambahkan lagu ke playlist & auto-download |
| `DELETE` | `/api/playlists/{id}/songs/{song_id}` | Menghapus lagu & membersihkan file lokal |
| `POST` | `/api/playlists/{id}/download-all` | Trigger unduh semua lagu yang belum terunduh |
| `POST` | `/api/playlists/{id}/songs/{song_id}/download` | Trigger unduh lagu spesifik |

### Search (`/api/search`)
| Method | Path | Deskripsi |
|---|---|---|
| `GET` | `/api/search?q={query}` | Mencari lagu/artis di YouTube Music |
| `GET` | `/api/search/resolve?url={url}` | Mengekstrak metadata trek dari URL/ID YouTube |

---

## 💻 Menjalankan Secara Lokal (Development)

### Prasyarat:
- Python 3.10+
- `mpv` terpasang di sistem (`sudo apt install mpv` / `brew install mpv`)
- `ffmpeg` terpasang di sistem

### Langkah-langkah:
```bash
# 1. Masuk ke root direktori proyek dan buat virtualenv
python3 -m venv venv
source venv/bin/activate

# 2. Install dependensi
pip install -r backend/requirements.txt

# 3. Jalankan server FastAPI
uvicorn backend.app.main:app --reload --port 8000
```
Dokumentasi interaktif OpenAPI Swagger dapat diakses di:
`http://localhost:8000/docs`
