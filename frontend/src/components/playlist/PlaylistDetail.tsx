import React from 'react';
import { Play, ListPlus, Music, Clock, DownloadCloud, ArrowLeft } from 'lucide-react';
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
  onBack?: () => void;
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
  onBack,
}) => {
  const undownloadedCount = playlist.songs.filter((s) => !s.is_downloaded).length;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 pb-28">
      {/* Mobile Back Button */}
      {onBack && (
        <div className="md:hidden mb-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white active:scale-95 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Koleksi Playlist</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between pb-6 border-b border-zinc-800 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-600 via-red-600 to-rose-700 flex items-center justify-center text-white shadow-xl shadow-red-950/40 shrink-0">
            <Music className="w-10 h-10" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">
              Playlist SQLite
            </span>
            <h2 className="text-xl sm:text-3xl font-extrabold text-zinc-100 mt-1 leading-tight">
              {playlist.name}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {playlist.songs.length} lagu • {undownloadedCount === 0 ? 'Semua terunduh offline' : `${undownloadedCount} belum diunduh`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap pt-2 sm:pt-0">
          <button
            onClick={onPlayAll}
            disabled={playlist.songs.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-semibold text-sm rounded-xl shadow-lg shadow-red-600/30 transition disabled:opacity-40"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Putar Semua</span>
          </button>

          {undownloadedCount > 0 && onDownloadAll && (
            <button
              onClick={onDownloadAll}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-950/60 border border-emerald-700/60 hover:bg-emerald-900/60 active:scale-95 text-emerald-300 text-xs font-semibold rounded-xl transition"
              title="Unduh seluruh lagu untuk pemutaran offline"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Download All ({undownloadedCount})</span>
            </button>
          )}

          <button
            onClick={onOpenAddModal}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 text-xs font-semibold rounded-xl transition"
          >
            <ListPlus className="w-4 h-4" />
            <span>+ Tambah Lagu</span>
          </button>
        </div>
      </div>

      {/* Track List */}
      <div className="mt-4 flex-1">
        <div className="divide-y divide-zinc-800/40">
          {playlist.songs.length === 0 ? (
            <div className="text-center py-16 px-4 text-zinc-500 text-sm space-y-3">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
                <Music className="w-6 h-6" />
              </div>
              <div>Playlist ini masih kosong.</div>
              <button
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-md transition active:scale-95"
              >
                <ListPlus className="w-4 h-4" />
                <span>Tambah Lagu / Link YouTube</span>
              </button>
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
