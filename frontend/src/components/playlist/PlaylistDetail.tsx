import React from 'react';
import { Play, ListPlus, Music, Clock, DownloadCloud } from 'lucide-react';
import { PlaylistDetail as PlaylistDetailType } from '../../types/playlist';
import { SongItem } from './SongItem';

interface PlaylistDetailProps {
  playlist: PlaylistDetailType;
  currentVideoId?: string | null;
  onPlayAll: () => void;
  onPlaySong: (startIndex: number) => void;
  onRemoveSong: (songId: number) => void;
  onOpenAddModal: () => void;
  onDownloadAll?: () => void;
  onDownloadSong?: (songId: number) => void;
}

export const PlaylistDetail: React.FC<PlaylistDetailProps> = ({
  playlist,
  currentVideoId,
  onPlayAll,
  onPlaySong,
  onRemoveSong,
  onOpenAddModal,
  onDownloadAll,
  onDownloadSong,
}) => {
  const undownloadedCount = playlist.songs.filter((s) => !s.is_downloaded).length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between pb-6 border-b border-zinc-800 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-600 via-red-600 to-rose-700 flex items-center justify-center text-white shadow-xl shadow-red-950/40 shrink-0">
            <Music className="w-10 h-10" />
          </div>
          <div>
            <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
              Playlist Lokal
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 mt-1">
              {playlist.name}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {playlist.songs.length} lagu • Disimpan di SQLite lokal
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <button
            onClick={onPlayAll}
            disabled={playlist.songs.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium text-sm rounded-xl shadow-lg shadow-red-600/30 active:scale-95 transition disabled:opacity-40"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Play All</span>
          </button>

          {undownloadedCount > 0 && onDownloadAll && (
            <button
              onClick={onDownloadAll}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-900/40 border border-emerald-700/50 hover:bg-emerald-800/50 text-emerald-300 text-xs font-medium rounded-xl transition"
              title="Download semua lagu di playlist ini ke Raspberry Pi untuk pemutaran offline"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Download All ({undownloadedCount})</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition"
          >
            <ListPlus className="w-4 h-4" />
            <span>+ Tambah Lagu</span>
          </button>
        </div>
      </div>

      {/* Track List */}
      <div className="mt-6 flex-1">
        <div className="grid grid-cols-12 text-xs font-semibold text-zinc-400 px-3 pb-2 border-b border-zinc-800 uppercase tracking-wider select-none">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-8 sm:col-span-6">Judul Lagu</div>
          <div className="col-span-3 hidden sm:block">Artist</div>
          <div className="col-span-2 text-right flex items-center justify-end gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Durasi</span>
          </div>
          <div className="col-span-1"></div>
        </div>

        <div className="divide-y divide-zinc-800/40 mt-1">
          {playlist.songs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              Playlist ini masih kosong. Klik <strong>"+ Tambah Lagu"</strong> atau cari lagu di menu Explore!
            </div>
          ) : (
            playlist.songs.map((song, index) => (
              <SongItem
                key={song.id}
                song={song}
                index={index}
                isCurrentlyPlaying={currentVideoId === song.video_id}
                onPlay={() => onPlaySong(index)}
                onRemove={() => onRemoveSong(song.id)}
                onDownload={() => onDownloadSong && onDownloadSong(song.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

