import React from 'react';
import { Play, Trash2, Music, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { PlaylistSong } from '../../types/playlist';

interface SongItemProps {
  song: PlaylistSong;
  index: number;
  isCurrentlyPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onDownload?: () => void;
}

export const SongItem: React.FC<SongItemProps> = ({
  song,
  index,
  isCurrentlyPlaying,
  onPlay,
  onRemove,
  onDownload,
}) => {
  const formatTime = (seconds: number): string => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      onClick={onPlay}
      className={`flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-zinc-800/60 active:bg-zinc-800 transition cursor-pointer text-sm group select-none gap-2 ${
        isCurrentlyPlaying ? 'bg-zinc-800/80 text-red-400' : 'text-zinc-200'
      }`}
    >
      {/* Left: Index + Thumbnail + Title/Artist */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Index or Play icon */}
        <div className="w-6 text-center text-xs font-mono shrink-0">
          {isCurrentlyPlaying ? (
            <span className="text-red-500 font-bold animate-pulse">▶</span>
          ) : (
            <>
              <span className="group-hover:hidden text-zinc-500">{index + 1}</span>
              <Play className="w-3.5 h-3.5 hidden group-hover:inline text-zinc-100 fill-current" />
            </>
          )}
        </div>

        {/* Thumbnail */}
        <div className="relative w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/50 overflow-hidden shrink-0 flex items-center justify-center">
          {song.thumbnail_url ? (
            <img
              src={song.thumbnail_url}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-5 h-5 text-zinc-500" />
          )}
          {song.is_downloaded && (
            <div className="absolute bottom-0 right-0 p-0.5 bg-black/60 rounded-tl-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            </div>
          )}
        </div>

        {/* Song info */}
        <div className="min-w-0 flex-1 pr-1">
          <div className={`font-semibold text-sm truncate ${isCurrentlyPlaying ? 'text-red-400' : 'text-zinc-100'}`}>
            {song.title}
          </div>
          <div className="text-xs text-zinc-400 truncate mt-0.5 flex items-center gap-1.5">
            <span className="truncate">{song.artist}</span>
            {song.is_downloaded && (
              <span className="shrink-0 px-1.5 py-0.2 text-[9px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded">
                Offline
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Duration & Actions */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Duration */}
        <span className="text-xs font-mono text-zinc-400 w-11 text-right hidden xs:inline-block">
          {formatTime(song.duration)}
        </span>

        {/* Offline Download Status / Action Button */}
        {song.is_downloaded ? (
          <div
            className="w-8 h-8 flex items-center justify-center text-emerald-400"
            title="Tersimpan Offline di Raspberry Pi"
          >
            <CheckCircle2 className="w-4 h-4" />
          </div>
        ) : song.download_status === 'downloading' ? (
          <div
            className="w-8 h-8 flex items-center justify-center text-amber-400"
            title="Sedang men-download..."
          >
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        ) : (
          <button
            onClick={() => onDownload && onDownload()}
            className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 active:scale-90 rounded-lg hover:bg-zinc-800 transition"
            title="Download untuk offline di Raspberry Pi"
          >
            <Download className="w-4 h-4" />
          </button>
        )}

        {/* Delete button */}
        <button
          onClick={onRemove}
          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-red-400 active:scale-90 rounded-lg hover:bg-zinc-800 transition"
          title="Hapus lagu"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
