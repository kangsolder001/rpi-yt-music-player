import React, { useState } from 'react';
import { X, ListPlus, Loader2, AlertCircle, CheckCircle2, Link2, Music2 } from 'lucide-react';
import { api } from '../../services/api';
import { PlaylistDetail } from '../../types/playlist';

interface ImportPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (playlist: PlaylistDetail) => void;
}

export const ImportPlaylistModal: React.FC<ImportPlaylistModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [url, setUrl] = useState('');
  const [customName, setCustomName] = useState('');
  const [maxSongs, setMaxSongs] = useState<number>(100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Harap masukkan URL atau ID playlist YouTube terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const playlist = await api.importYouTubePlaylist({
        url: url.trim(),
        custom_name: customName.trim() || undefined,
        max_songs: maxSongs,
      });

      setUrl('');
      setCustomName('');
      setMaxSongs(100);
      onSuccess(playlist);
      onClose();
    } catch (err: any) {
      console.error('Import playlist error:', err);
      setError(err.message || 'Gagal mengimpor playlist. Pastikan URL benar dan playlist tidak bersifat Private.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
              <ListPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Impor Playlist YouTube</h2>
              <p className="text-xs text-zinc-400">Simpan seluruh lagu ke playlist lokal SQLite</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-red-400" />
              Link URL / ID Playlist YouTube *
            </label>
            <input
              type="text"
              placeholder="https://music.youtube.com/playlist?list=PL... atau PL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="w-full px-3.5 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition"
              required
            />
            <p className="text-[11px] text-zinc-500">
              Mendukung playlist YouTube Music dan YouTube standar yang bersifat Publik / Unlisted.
            </p>
          </div>

          {/* Custom Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Music2 className="w-3.5 h-3.5 text-zinc-400" />
              Nama Playlist Lokal (Opsional)
            </label>
            <input
              type="text"
              placeholder="Kosongkan untuk memakai judul asli dari YouTube"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              disabled={isLoading}
              className="w-full px-3.5 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition"
            />
          </div>

          {/* Max Songs Limit */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Maksimal Jumlah Lagu
            </label>
            <select
              value={maxSongs}
              onChange={(e) => setMaxSongs(Number(e.target.value))}
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition"
            >
              <option value={25}>Maksimal 25 lagu</option>
              <option value={50}>Maksimal 50 lagu</option>
              <option value={100}>Maksimal 100 lagu (Standar)</option>
              <option value={150}>Maksimal 150 lagu</option>
              <option value={200}>Maksimal 200 lagu</option>
            </select>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-3.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-xs text-zinc-300 flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-red-500 animate-spin shrink-0" />
              <div className="space-y-0.5">
                <p className="font-semibold text-white">Sedang Mengekstrak Playlist...</p>
                <p className="text-[11px] text-zinc-400">
                  Mengambil metadata lagu dari YouTube dan menyimpannya ke database lokal.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengimpor...</span>
                </>
              ) : (
                <>
                  <ListPlus className="w-4 h-4" />
                  <span>Impor Playlist</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

