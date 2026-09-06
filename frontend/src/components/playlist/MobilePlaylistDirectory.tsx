import React, { useState } from 'react';
import { Plus, Music, Play, Trash2, ListMusic, Sparkles } from 'lucide-react';
import { PlaylistSummary } from '../../types/playlist';

interface MobilePlaylistDirectoryProps {
  playlists: PlaylistSummary[];
  onSelectPlaylist: (id: number) => void;
  onCreatePlaylist: (name: string, description?: string) => Promise<void>;
  onDeletePlaylist: (id: number) => Promise<void>;
  onPlayPlaylist?: (id: number) => void;
}

export const MobilePlaylistDirectory: React.FC<MobilePlaylistDirectoryProps> = ({
  playlists,
  onSelectPlaylist,
  onCreatePlaylist,
  onDeletePlaylist,
  onPlayPlaylist,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreatePlaylist(name.trim(), description.trim() || undefined);
    setName('');
    setDescription('');
    setIsCreating(false);
  };

  return (
    <div className="p-4 space-y-5 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <ListMusic className="w-6 h-6 text-red-500" />
            <span>Koleksi Playlist</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Daftar putar tersimpan di database SQLite lokal
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Baru</span>
        </button>
      </div>

      {/* New Playlist Form */}
      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-4 space-y-3 shadow-xl animate-in fade-in duration-200"
        >
          <div className="font-semibold text-sm text-zinc-200">Buat Playlist Baru</div>
          <input
            type="text"
            autoFocus
            placeholder="Nama Playlist (contoh: Santai Sore, Workout)..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <input
            type="text"
            placeholder="Deskripsi singkat (opsional)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 active:scale-95"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-red-600/20 active:scale-95 transition"
            >
              Simpan Playlist
            </button>
          </div>
        </form>
      )}

      {/* Playlists Grid / Cards */}
      {playlists.length === 0 ? (
        <div className="text-center py-16 px-4 bg-zinc-900/40 rounded-3xl border border-zinc-800/80 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <Music className="w-8 h-8" />
          </div>
          <div className="font-medium text-zinc-300 text-sm">Belum Ada Playlist</div>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Buat playlist pertamamu sekarang untuk mengumpulkan lagu favorit dan memutarnya offline!
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Playlist Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              className="bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800/90 active:border-zinc-700 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md cursor-pointer active:scale-[0.99] transition select-none"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-red-950/40 shrink-0">
                  <Music className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm sm:text-base text-zinc-100 truncate">
                    {pl.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    <span className="font-mono text-zinc-300">{pl.song_count} lagu</span>
                    {pl.description && (
                      <>
                        <span>•</span>
                        <span className="truncate">{pl.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {onPlayPlaylist && pl.song_count > 0 && (
                  <button
                    onClick={() => onPlayPlaylist(pl.id)}
                    className="p-2.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white active:scale-90 transition"
                    title="Putar Semua"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Hapus playlist "${pl.name}" beserta lagunya?`)) {
                      onDeletePlaylist(pl.id);
                    }
                  }}
                  className="p-2.5 text-zinc-500 hover:text-red-400 active:scale-90 transition"
                  title="Hapus Playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
