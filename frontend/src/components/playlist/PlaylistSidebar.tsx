import React, { useState } from 'react';
import { Plus, ListMusic, Trash2, Compass, Radio } from 'lucide-react';
import { PlaylistSummary } from '../../types/playlist';

interface PlaylistSidebarProps {
  playlists: PlaylistSummary[];
  selectedPlaylistId: number | null;
  currentView: 'explore' | 'playlist';
  onSelectPlaylist: (id: number) => void;
  onSelectExplore: () => void;
  onCreatePlaylist: (name: string, description?: string) => Promise<void>;
  onDeletePlaylist: (id: number) => Promise<void>;
}

export const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({
  playlists,
  selectedPlaylistId,
  currentView,
  onSelectPlaylist,
  onSelectExplore,
  onCreatePlaylist,
  onDeletePlaylist,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    await onCreatePlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setIsCreating(false);
  };

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between shrink-0 select-none">
      <div className="space-y-6">
        {/* Navigation */}
        <div>
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider px-3 mb-2">
            Menu
          </div>
          <nav className="space-y-1">
            <button
              onClick={onSelectExplore}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                currentView === 'explore'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Compass className="w-4 h-4 text-red-500" />
              <span>Explore & Search</span>
            </button>
          </nav>
        </div>

        {/* Playlists (SQLite) */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <ListMusic className="w-3.5 h-3.5" />
              <span>Playlists (SQLite)</span>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
              title="Buat Playlist Baru"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* New Playlist Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="px-3 mb-3">
              <input
                type="text"
                autoFocus
                placeholder="Nama playlist..."
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <div className="flex justify-end gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-0.5 text-[11px] bg-red-600 text-white rounded font-medium hover:bg-red-500"
                >
                  Simpan
                </button>
              </div>
            </form>
          )}

          {/* Playlist List */}
          <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
            {playlists.length === 0 ? (
              <div className="px-3 py-4 text-xs text-zinc-500 italic text-center">
                Belum ada playlist. Buat playlist baru untuk menyimpan lagu favoritmu!
              </div>
            ) : (
              playlists.map((pl) => (
                <div
                  key={pl.id}
                  className={`group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                    currentView === 'playlist' && selectedPlaylistId === pl.id
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                  onClick={() => onSelectPlaylist(pl.id)}
                >
                  <span className="truncate flex-1">{pl.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 font-mono">
                      {pl.song_count}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hapus playlist "${pl.name}"?`)) {
                          onDeletePlaylist(pl.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition"
                      title="Hapus playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Hardware Info Box */}
      <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs text-zinc-400">
        <div className="flex items-center gap-2 font-medium text-zinc-200 mb-1">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>Raspberry Pi 4</span>
        </div>
        <p className="text-[11px] text-zinc-500">Output: 3.5mm Headphone Jack</p>
        <p className="text-[11px] text-zinc-500">Audio Engine: mpv + ALSA</p>
      </div>
    </aside>
  );
};

