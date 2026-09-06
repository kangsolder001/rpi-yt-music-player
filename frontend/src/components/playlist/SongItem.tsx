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
      className={`grid grid-cols-12 items-center px-3 py-2.5 rounded-xl hover:bg-zinc-800/60 transition cursor-pointer text-sm group ${
        isCurrentlyPlaying ? 'bg-zinc-800/80 text-red-400' : 'text-zinc-200'
      }`}
    >
      {/* Index or Play indicator */}
      <div className="col-span-1 text-center text-xs font-mono">
        {isCurrentlyPlaying ? (
          <span className="text-red-500 font-bold animate-pulse">▶</span>
        ) : (
          <>
            <span className="group-hover:hidden text-zinc-500">{index + 1}</span>
            <Play className="w-3.5 h-3.5 hidden group-hover:inline text-zinc-100 fill-current" />
          </>
        )}
      </div>

      {/* Song Info (Thumbnail & Title) */}
      <div className="col-span-8 sm:col-span-6 flex items-center gap-3 pr-2">
        <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/50 overflow-hidden shrink-0 flex items-center justify-center">
          {song.thumbnail_url ? (
            <img
              src={song.thumbnail_url}
              alt={song.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-4 h-4 text-zinc-500" />
          )}
        </div>
        <div className="truncate">
          <div className={`font-medium truncate ${isCurrentlyPlaying ? 'text-red-400' : 'text-zinc-100'}`}>
            {song.title}
          </div>
          <div className="text-xs text-zinc-400 sm:hidden truncate">{song.artist}</div>
        </div>
      </div>

      {/* Artist (Desktop) */}
      <div className="col-span-3 text-xs text-zinc-400 hidden sm:block truncate">
        {song.artist}
      </div>

      {/* Duration */}
      <div className="col-span-2 text-xs font-mono text-zinc-400 text-right">
        {formatTime(song.duration)}
      </div>

      {/* Download & Remove Buttons */}
      <div className="col-span-1 flex items-center justify-end gap-1">
        {song.is_downloaded ? (
          <span title="Tersimpan Offline di Raspberry Pi">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </span>
        ) : song.download_status === 'downloading' ? (
          <span title="Sedang men-download...">
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload && onDownload();
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-zinc-100 transition"
            title="Download untuk offline"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-red-400 transition"
          title="Hapus dari playlist"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

