import React from 'react';
import { Play, Plus, Music, Sparkles } from 'lucide-react';
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
      <div className="text-center py-20 px-4 text-zinc-500 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-600">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="text-sm font-medium text-zinc-400">Siap Menemukan Musik</div>
        <p className="text-xs text-zinc-600 max-w-sm mx-auto">
          Cari judul lagu, artis, atau tempel link YouTube pada kolom pencarian di atas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 pb-24">
      <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-zinc-400 border-b border-zinc-800 uppercase tracking-wider">
        <span>Hasil Pencarian ({results.length})</span>
        <span>Aksi</span>
      </div>

      <div className="divide-y divide-zinc-800/40">
        {results.map((song, idx) => {
          const isPlaying = currentVideoId === song.video_id;
          return (
            <div
              key={song.video_id}
              onClick={() => onPlaySong(song)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-zinc-800/60 active:bg-zinc-800 transition cursor-pointer select-none gap-3 group ${
                isPlaying ? 'bg-zinc-800/80 text-red-400' : 'text-zinc-200'
              }`}
            >
              {/* Left: Index + Thumbnail + Details */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Index / Play icon */}
                <div className="w-5 text-center text-xs font-mono shrink-0">
                  {isPlaying ? (
                    <span className="text-red-500 font-bold animate-pulse">▶</span>
                  ) : (
                    <>
                      <span className="group-hover:hidden text-zinc-500">{idx + 1}</span>
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
                </div>

                {/* Title & Artist */}
                <div className="min-w-0 flex-1 pr-1">
                  <div className={`font-semibold text-sm truncate ${isPlaying ? 'text-red-400' : 'text-zinc-100'}`}>
                    {song.title}
                  </div>
                  <div className="text-xs text-zinc-400 truncate mt-0.5 flex items-center gap-2">
                    <span className="truncate">{song.artist}</span>
                    {song.duration > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-zinc-500">{formatTime(song.duration)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Add to Playlist */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onAddToPlaylist(song)}
                  className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 active:scale-90 rounded-xl transition"
                  title="Simpan ke Playlist"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
