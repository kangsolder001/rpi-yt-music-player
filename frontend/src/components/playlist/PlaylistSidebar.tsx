import React, { useState, useEffect } from 'react';
import { Plus, ListMusic, Trash2, Compass, Radio, Flame, Activity, HardDrive, ListPlus } from 'lucide-react';
import { PlaylistSummary } from '../../types/playlist';
import { SystemHealthResponse } from '../../types/system';
import { api } from '../../services/api';

interface PlaylistSidebarProps {
  playlists: PlaylistSummary[];
  selectedPlaylistId: number | null;
  currentView: 'explore' | 'playlist';
  onSelectPlaylist: (id: number) => void;
  onSelectExplore: () => void;
  onCreatePlaylist: (name: string, description?: string) => Promise<void>;
  onDeletePlaylist: (id: number) => Promise<void>;
  onOpenSystemHealth?: () => void;
  onOpenImportModal?: () => void;
}

export const PlaylistSidebar: React.FC<PlaylistSidebarProps> = ({
  playlists,
  selectedPlaylistId,
  currentView,
  onSelectPlaylist,
  onSelectExplore,
  onCreatePlaylist,
  onDeletePlaylist,
  onOpenSystemHealth,
  onOpenImportModal,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);

  useEffect(() => {
    const loadHealth = () => {
      api.getSystemHealth().then(setHealth).catch(() => {});
    };
    loadHealth();
    const timer = setInterval(loadHealth, 10000);
    return () => clearInterval(timer);
  }, []);

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
              <span>Koleksi Playlist</span>
            </div>
            <div className="flex items-center gap-1">
              {onOpenImportModal && (
                <button
                  onClick={onOpenImportModal}
                  className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition"
                  title="Impor Playlist dari YouTube"
                >
                  <ListPlus className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setIsCreating(true)}
                className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
                title="Buat Playlist Baru"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
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

      {/* Hardware & Health Info Box */}
      <div
        onClick={onOpenSystemHealth}
        className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 text-xs transition cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/90 group active:scale-[0.99]"
        title="Klik untuk melihat monitor kesehatan & hardware Raspberry Pi 4"
      >
        <div className="flex items-center justify-between font-medium text-zinc-200 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-zinc-200">Raspberry Pi 4</span>
          </div>
          <span className="text-[10px] text-zinc-500 group-hover:text-red-400 transition font-medium">
            Monitor →
          </span>
        </div>

        {health ? (
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Flame className={`w-3.5 h-3.5 ${
                  health.cpu_temp_status === 'hot'
                    ? 'text-red-400'
                    : health.cpu_temp_status === 'warm'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`} />
                <span>Suhu CPU</span>
              </span>
              <span className={`font-bold ${
                health.cpu_temp_status === 'hot'
                  ? 'text-red-400'
                  : health.cpu_temp_status === 'warm'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {health.cpu_temp !== null ? `${health.cpu_temp}°C` : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>RAM</span>
              </span>
              <span className="font-medium text-zinc-300">
                {health.ram.percent}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sisa Disk</span>
              </span>
              <span className="font-medium text-zinc-300">
                {health.disk.free_gb} GB
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-zinc-500">
            <p>Output: 3.5mm Headphone Jack</p>
            <p>Audio Engine: mpv + ALSA</p>
          </div>
        )}
      </div>
    </aside>
  );
};

