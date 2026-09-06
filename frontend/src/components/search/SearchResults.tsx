import React from 'react';
import { Play, Plus, Music, Clock } from 'lucide-react';
import { SearchResult } from '../../types/player';

interface SearchResultsProps {
  results: SearchResult[];
  onPlaySong: (song: SearchResult) => void;
  onAddToPlaylist: (song: SearchResult) => void;
  currentVideoId?: string | null;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onPlaySong,
  onAddToPlaylist,
  currentVideoId,
}) => {
  const formatTime = (seconds: number): string => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500 text-sm">
        Ketik judul lagu atau artis pada kolom pencarian di atas.
      </div>
    );
  }

  return (
    <div className="space-y-1">
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

      <div className="divide-y divide-zinc-800/40">
        {results.map((song, idx) => {
          const isPlaying = currentVideoId === song.video_id;
          return (
            <div
              key={song.video_id}
              className={`grid grid-cols-12 items-center px-3 py-2.5 rounded-xl hover:bg-zinc-800/60 transition cursor-pointer group ${
                isPlaying ? 'bg-zinc-800/80 text-red-400' : 'text-zinc-200'
              }`}
            >
              {/* Index or Play indicator */}
              <div
                onClick={() => onPlaySong(song)}
                className="col-span-1 text-center text-xs font-mono"
              >
                {isPlaying ? (
                  <span className="text-red-500 font-bold animate-pulse">▶</span>
                ) : (
                  <>
                    <span className="group-hover:hidden text-zinc-500">{idx + 1}</span>
                    <Play className="w-3.5 h-3.5 hidden group-hover:inline text-zinc-100 fill-current" />
                  </>
                )}
              </div>

              {/* Title & Thumbnail */}
              <div
                onClick={() => onPlaySong(song)}
                className="col-span-8 sm:col-span-6 flex items-center gap-3 pr-2"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/50 overflow-hidden shrink-0 flex items-center justify-center">
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
                  <div className={`font-medium truncate ${isPlaying ? 'text-red-400' : 'text-zinc-100'}`}>
                    {song.title}
                  </div>
                  <div className="text-xs text-zinc-400 sm:hidden truncate">{song.artist}</div>
                </div>
              </div>

              {/* Artist */}
              <div
                onClick={() => onPlaySong(song)}
                className="col-span-3 text-xs text-zinc-400 hidden sm:block truncate"
              >
                {song.artist}
              </div>

              {/* Duration */}
              <div
                onClick={() => onPlaySong(song)}
                className="col-span-2 text-xs font-mono text-zinc-400 text-right"
              >
                {formatTime(song.duration)}
              </div>

              {/* Add to Playlist button */}
              <div className="col-span-1 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToPlaylist(song);
                  }}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 rounded-lg transition"
                  title="Simpan ke Playlist"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

