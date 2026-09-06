import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Plus, Music, Loader2, Disc3 } from 'lucide-react';
import { SearchResult, RecommendationCategory } from '../../types/player';
import { api } from '../../services/api';

interface ExploreRecommendationsProps {
  currentVideoId?: string | null;
  onPlaySong: (song: SearchResult) => void;
  onAddToPlaylist: (song: SearchResult) => void;
}

export const ExploreRecommendations: React.FC<ExploreRecommendationsProps> = ({
  currentVideoId,
  onPlaySong,
  onAddToPlaylist,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('trending');
  const [categories, setCategories] = useState<RecommendationCategory[]>([
    { id: 'trending', title: 'Populer Hari Ini', emoji: '🔥' },
    { id: 'relax', title: 'Santai & Akustik', emoji: '☕' },
    { id: 'focus', title: 'Fokus & Lo-Fi', emoji: '🎧' },
    { id: 'galau', title: 'Galau & Nostalgia', emoji: '🌧️' },
    { id: 'energetic', title: 'Semangat & Rock', emoji: '⚡' },
  ]);
  const [songs, setSongs] = useState<SearchResult[]>([]);
  const [title, setTitle] = useState<string>('Populer Hari Ini');
  const [emoji, setEmoji] = useState<string>('🔥');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadCategory(selectedCategory);
  }, [selectedCategory]);

  const loadCategory = async (catId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getRecommendations(catId);
      setSongs(data.items);
      setTitle(data.title);
      setEmoji(data.emoji);
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
      }
    } catch (e) {
      console.error('Failed to load recommendations', e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Category Pills Bar (Horizontal Scrollable) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition active:scale-95 shrink-0 ${
                isActive
                  ? 'bg-zinc-100 text-zinc-950 shadow-md font-bold'
                  : 'bg-zinc-900/90 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.title}</span>
            </button>
          );
        })}
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg sm:text-xl font-extrabold text-zinc-100 flex items-center gap-2">
            <span>{emoji}</span>
            <span>{title}</span>
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Rekomendasi trek pilihan dari YouTube Music
          </p>
        </div>

        {songs.length > 0 && !isLoading && (
          <button
            onClick={() => onPlaySong(songs[0])}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white rounded-xl text-xs font-semibold transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Putar Teratas</span>
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <span className="text-xs">Memuat rekomendasi musik...</span>
        </div>
      ) : (
        /* Recommendations List / Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {songs.map((song, index) => {
            const isPlaying = currentVideoId === song.video_id;
            return (
              <div
                key={song.video_id}
                onClick={() => onPlaySong(song)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer select-none gap-3 group active:scale-[0.99] ${
                  isPlaying
                    ? 'bg-zinc-900 border-red-500/80 shadow-md shadow-red-950/40 text-red-400'
                    : 'bg-zinc-900/60 hover:bg-zinc-900 border-zinc-800/80 hover:border-zinc-700 text-zinc-200'
                }`}
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                    {song.thumbnail_url ? (
                      <img
                        src={song.thumbnail_url}
                        alt={song.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="w-5 h-5 text-zinc-500" />
                    )}

                    {/* Play hover overlay */}
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
                      isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {isPlaying ? (
                        <Disc3 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className={`font-semibold text-sm truncate leading-snug ${
                      isPlaying ? 'text-red-400' : 'text-zinc-100 group-hover:text-white'
                    }`}>
                      {song.title}
                    </h4>
                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {song.artist}
                    </p>
                    {song.duration > 0 && (
                      <span className="text-[10px] font-mono text-zinc-500 mt-0.5 block">
                        {formatTime(song.duration)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Add to Playlist */}
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onAddToPlaylist(song)}
                    className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-90 rounded-xl transition"
                    title="Simpan ke Playlist"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
