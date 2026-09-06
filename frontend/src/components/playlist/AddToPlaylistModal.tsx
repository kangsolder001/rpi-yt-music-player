import React, { useState } from 'react';
import { X, Link2, Plus, Loader2 } from 'lucide-react';
import { PlaylistSummary } from '../../types/playlist';
import { SearchResult } from '../../types/player';
import { api } from '../../services/api';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: PlaylistSummary[];
  prefilledSong?: SearchResult | null;
  onSuccess: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  onClose,
  playlists,
  prefilledSong,
  onSuccess,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number>(
    playlists[0]?.id || 0
  );
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlaylistId) {
      setError('Pilih playlist tujuan terlebih dahulu');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (prefilledSong) {
        await api.addSongToPlaylist(selectedPlaylistId, {
          video_id: prefilledSong.video_id,
          title: prefilledSong.title,
          artist: prefilledSong.artist,
          thumbnail_url: prefilledSong.thumbnail_url,
          duration: prefilledSong.duration,
        });
      } else {
        if (!urlInput.trim()) {
          setError('Masukkan link YouTube atau Video ID');
          setLoading(false);
          return;
        }
        await api.addSongToPlaylist(selectedPlaylistId, {
          video_id: urlInput.trim(),
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan lagu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-zinc-100 mb-1">Tambah Lagu ke Playlist</h3>
        <p className="text-xs text-zinc-400 mb-4">
          Lagu akan disimpan ke database SQLite internal Raspberry Pi.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {prefilledSong ? (
            <div className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
              {prefilledSong.thumbnail_url && (
                <img
                  src={prefilledSong.thumbnail_url}
                  alt={prefilledSong.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="truncate flex-1">
                <div className="text-sm font-medium text-zinc-100 truncate">
                  {prefilledSong.title}
                </div>
                <div className="text-xs text-zinc-400 truncate">{prefilledSong.artist}</div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Link YouTube atau Video ID
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="https://music.youtube.com/watch?v=..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Pilih Playlist Tujuan
            </label>
            <select
              value={selectedPlaylistId}
              onChange={(e) => setSelectedPlaylistId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} ({pl.song_count} lagu)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-red-600/30 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Tambahkan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

