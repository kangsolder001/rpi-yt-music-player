# ⚛️ RPi YouTube Music Player - Frontend

Frontend aplikasi web modern berbasis **React 18**, **TypeScript**, **Vite**, dan **Tailwind CSS** dengan antarmuka bertema gelap (*dark mode*) yang responsif untuk smartphone, tablet, maupun layar desktop.

---

## 🎨 Tampilan & Fitur Antarmuka

1. **Player Bar Persistent (Bagian Bawah)**:
   - **Track Info**: Cover thumbnail, judul lagu, dan nama artis.
   - **Controls**: Tombol Previous, Play/Pause, Stop, Next, dan tombol **Repeat** interaktif (siklus: *Mati* ➡️ *Ulang Semua* ➡️ *Ulang Lagu Ini*).
   - **Progress Bar**: Slider timeline interaktif untuk seek ke menit/detik tertentu dengan indikator durasi aktual.
   - **ALSA Hardware Volume**: Slider pengatur volume analog speaker Raspberry Pi yang di-*debounce* agar responsif dan tidak membebani jaringan.

2. **Daftar Playlist & Navigasi (Sidebar)**:
   - Membuat playlist baru, melihat daftar playlist lokal, dan jumlah lagu di masing-masing playlist.
   - Hapus playlist dengan konfirmasi.

3. **Detail Playlist**:
   - Menampilkan seluruh lagu dalam playlist dengan nomor urut.
   - **Indikator Status Unduhan**:
     - 🟢 Ikon Checkmark: Lagu sudah terunduh offline di Raspberry Pi.
     - 🔄 Ikon Spinner: Lagu sedang dalam proses pengunduhan.
     - ⬇️ Tombol Unduh: Unduh lagu individual secara manual.
   - Tombol **"Download All"** untuk mengunduh semua lagu yang belum ter-cache offline.

4. **Pencarian YouTube Music & Direct Link**:
   - Cari lagu atau artis secara langsung menggunakan YouTube Music Search.
   - *Direct URL paste*: Masukkan URL YouTube standar (`https://www.youtube.com/watch?v=...`) atau Video ID 11 karakter untuk langsung memutar atau menyimpannya ke playlist.

5. **Sinkronisasi Real-time**:
   - Menggunakan WebSocket client dengan fitur **auto-reconnect**. Status pemutaran, posisi detik, dan volume langsung ter-update di seluruh tab atau perangkat lain tanpa perlu refresh halaman.

---

## 📂 Struktur Folder

```text
frontend/
├── src/
│   ├── components/
│   │   ├── player/
│   │   │   ├── Controls.tsx          # Play, pause, next, prev, repeat mode
│   │   │   ├── PlayerBar.tsx         # Bottom player bar container
│   │   │   ├── ProgressBar.tsx       # Timeline seek bar dengan formatting durasi
│   │   │   └── VolumeSlider.tsx      # Master volume slider dengan debounce
│   │   ├── playlist/
│   │   │   ├── AddToPlaylistModal.tsx # Modal simpan lagu ke playlist
│   │   │   ├── PlaylistDetail.tsx    # Halaman detail playlist & Download All button
│   │   │   ├── PlaylistSidebar.tsx   # Sidebar daftar playlist & form tambah
│   │   │   └── SongItem.tsx          # Baris item lagu dengan indikator offline
│   │   └── search/
│   │       ├── SearchBar.tsx         # Input pencarian / URL resolver
│   │       └── SearchResults.tsx     # Grid/list hasil pencarian lagu
│   ├── services/
│   │   ├── api.ts                    # REST API client ke FastAPI
│   │   └── websocket.ts              # WebSocket client dengan auto-reconnect
│   ├── types/
│   │   ├── player.ts                 # Type definitions status player & search
│   │   └── playlist.ts               # Type definitions playlist & lagu
│   ├── App.tsx                       # State orchestrator & layout utama
│   ├── main.tsx                      # React root entrypoint
│   └── index.css                     # Tailwind utilities & custom scrollbar
├── package.json
├── tsconfig.json
├── vite.config.ts                    # Konfigurasi Vite & proxy backend lokal
└── tailwind.config.js
```

---

## 💻 Menjalankan Secara Lokal (Development)

### Prasyarat:
- Node.js 18+ dan npm

### Perintah:
```bash
# 1. Masuk ke direktori frontend
cd frontend

# 2. Install dependensi
npm install

# 3. Jalankan development server
npm run dev
```

Aplikasi web dapat dibuka di browser pada:
`http://localhost:3000`

> **Catatan Dev Proxy:** `vite.config.ts` telah dikonfigurasi untuk mem-proxy request `/api` dan `/ws` ke backend FastAPI lokal di `http://localhost:8000`.

### Build untuk Produksi:
```bash
npm run build
```
File bundle statis akan disimpan di folder `frontend/dist/`. Dalam proses deployment Docker, folder ini disalin ke container Python untuk di-serve langsung oleh FastAPI.
