# 🎵 RPi YouTube Music Player

Web-based YouTube Music Player yang dirancang khusus untuk berjalan di **Raspberry Pi 4** dengan deployment mudah menggunakan **Docker Compose**, kontrol volume hardware **ALSA (Jack Audio 3.5mm)**, database lokal **SQLite** untuk manajemen playlist, caching lagu offline otomatis via **`yt-dlp`**, dan antarmuka web modern responsif (desktop & mobile).

---

## ✨ Fitur Utama

* 🔊 **Hardware Audio Output (Raspberry Pi 3.5mm Jack):** Suara langsung keluar melalui speaker mini yang tercolok ke jack 3.5mm RPi tanpa memerlukan soundcard USB tambahan.
* 🎚️ **Hardware ALSA Volume Control:** Slider volume mengontrol langsung level analog soundcard OS (`amixer`), sementara volume internal software dikunci 100% demi kualitas suara optimal dan bebas noise digital.
* ⚡ **Audio Engine Super Ringan (`mpv` + IPC Socket):** Menggunakan daemon `mpv` dengan IPC socket (< 150MB RAM), tanpa membebani Raspberry Pi dengan browser Chromium yang rakus resource.
* 💾 **Offline Caching & Auto-Download:** Lagu yang dimasukkan ke playlist otomatis diunduh di latar belakang ke format audio `.m4a` lokal. Pemutaran lagu offline instan (0s buffer) tanpa perlu koneksi internet berulang.
* 🧹 **Smart Disk Cleanup:** Menghapus lagu atau playlist akan otomatis membersihkan file `.m4a` terkait dari disk jika file tersebut tidak digunakan oleh playlist lain, menjaga penyimpanan microSD RPi tetap hemat.
* 🔁 **Mode Repeat Lengkap:** Mendukung 3 mode pemutaran: Mati (`off`), Ulang Semua (`all`), dan Ulang Lagu Ini (`one`).
* 📋 **Manajemen Playlist Lokal (SQLite):** Buat, edit, dan hapus playlist favorit yang tersimpan permanen di database lokal SQLite.
* 🔍 **YouTube Music Search & Direct Link:** Cari lagu langsung dari YouTube Music atau cukup *paste* link YouTube / Video ID untuk langsung diputar atau disimpan ke playlist.
* 🔄 **Sinkronisasi Real-time (WebSocket):** Progress bar, durasi lagu, status play/pause, dan pergantian trek tersinkronisasi instan di semua tab atau perangkat yang terhubung.
* 🚀 **Build di PC Host & One-Click Deploy:** Image Docker di-cross-compile (`linux/arm64`) di komputer development dan ditransfer via SSH (`deploy.sh`) agar proses deploy cepat tanpa membebani CPU Raspberry Pi.

---

## 🏗️ Struktur Proyek

Repositori dipisahkan dengan bersih antara backend dan frontend:

```text
rpi-yt-music-player/
├── backend/                  # Layanan FastAPI, MPV Daemon, ALSA Mixer, & SQLite
│   ├── app/
│   │   ├── config.py         # Konfigurasi & environment variables
│   │   ├── database.py       # Koneksi SQLite & auto-migrasi skema
│   │   ├── models.py         # SQLAlchemy models (Playlist, PlaylistSong)
│   │   ├── schemas.py        # Pydantic schemas (Request / Response)
│   │   ├── websocket.py      # WebSocket connection manager
│   │   ├── services/
│   │   │   ├── audio_mixer.py # Kontrol ALSA amixer (Hardware volume 3.5mm jack)
│   │   │   ├── downloader.py  # Background downloader yt-dlp & file cleanup
│   │   │   ├── mpv_player.py  # mpv daemon manager via UNIX JSON IPC socket
│   │   │   └── ytmusic.py     # YouTube Music search & metadata scraper
│   │   ├── routers/
│   │   │   ├── player.py      # Endpoints pemutar musik & websocket
│   │   │   ├── playlists.py   # Endpoints CRUD playlist & offline download
│   │   │   └── search.py      # Endpoints pencarian lagu & resolve URL
│   │   └── main.py            # FastAPI entry point & static SPA mounting
│   ├── requirements.txt
│   └── README.md             # 👉 Baca backend/README.md untuk dokumentasi API lengkap
│
├── frontend/                 # Antarmuka SPA React 18 + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/
│   │   │   ├── player/       # Controls, ProgressBar, VolumeSlider, PlayerBar
│   │   │   ├── playlist/     # PlaylistSidebar, PlaylistDetail, AddToPlaylistModal
│   │   │   └── search/       # SearchBar, SearchResults
│   │   ├── services/         # REST API & WebSocket client
│   │   ├── types/            # TypeScript interface definitions
│   │   ├── App.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md             # 👉 Baca frontend/README.md untuk detail UI & components
│
├── data/                     # Volume direktori persisten (music.db & data unduhan)
├── deploy.sh                 # Skrip build ARM64 di host & deploy otomatis via SSH
├── Dockerfile                # Multi-stage build (Vite -> Python + mpv + ALSA + yt-dlp)
├── docker-compose.yml        # Konfigurasi Docker Compose dengan pass-through /dev/snd
└── README.md
```

---

## 🚀 Panduan Deployment ke Raspberry Pi 4

### 1. Persiapan Hardware Raspberry Pi 4
1. Colokkan speaker mini ke **jack audio 3.5mm** Raspberry Pi 4.
2. Colokkan kabel power USB speaker ke port USB Raspberry Pi 4.
3. Hubungkan Raspberry Pi ke jaringan WiFi/LAN yang sama dengan komputer Anda.

### 2. Deploy Otomatis dari Komputer Host (Direkomendasikan)
Agar proses kompilasi Docker tidak memakan resource dan waktu lama di Raspberry Pi, jalankan script `deploy.sh` dari komputer pengembangan:

```bash
# Jalankan deploy ke IP Raspberry Pi (contoh target: myrpi2@192.168.1.111)
./deploy.sh myrpi2@192.168.1.111
```

Skrip ini akan secara otomatis:
1. Memeriksa koneksi SSH ke Raspberry Pi.
2. Mem-build image multi-arsitektur `linux/arm64` di PC host menggunakan Docker Buildx.
3. Mengompres dan mentransfer image serta konfigurasi ke Raspberry Pi via SCP.
4. Me-load image dan menjalankan container via `docker compose up -d` di Raspberry Pi.

---

### 3. Akses Web Player
Setelah container berjalan, buka browser dari HP, tablet, atau laptop pada alamat:

```text
http://192.168.1.111:8000
```
*(Ganti dengan IP Raspberry Pi Anda jika berbeda)*

---

## 🛠️ Konfigurasi Perangkat Suara (ALSA)

Pada sistem operasi Raspberry Pi OS (Debian 12 Bookworm / Debian 13 Trixie), jack audio 3.5mm `bcm2835 Headphones` dikenali sebagai **Card 2** dengan mixer control **`PCM`**. Konfigurasi default di `docker-compose.yml`:

```yaml
environment:
  - ALSA_CARD=2
  - ALSA_CONTROL=PCM
  - MPV_AUDIO_DEVICE=alsa/plughw:2,0
```

> **Catatan:** Jika Anda menggunakan sound card USB atau DAC terpisah, jalankan `aplay -l` dan `amixer scontrols` di terminal RPi untuk melihat nomor Card dan nama Mixer Control yang sesuai.

---

## 📖 Dokumentasi Detail Komponen

* **Backend & REST API Reference:** Lihat [backend/README.md](backend/README.md)
* **Frontend & Komponen UI:** Lihat [frontend/README.md](frontend/README.md)

---

## 📜 Lisensi
Distributed under the MIT License.
