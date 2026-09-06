import React from 'react';
import { Music, Play, Pause, SkipForward, Disc3, Volume2 } from 'lucide-react';
import { PlayerState } from '../../types/player';
import { api } from '../../services/api';

interface MiniPlayerProps {
  playerState: PlayerState;
  onOpenFullPlayer: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  playerState,
  onOpenFullPlayer,
}) => {
  const currentTrack = playerState.current_track;
  const isPlaying = playerState.is_playing;
  const duration = playerState.duration || 0;
  const currentTime = playerState.current_time || 0;

  if (!currentTrack && playerState.is_idle) {
    return null;
  }

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    api.togglePlayPause().catch(console.error);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    api.nextTrack().catch(console.error);
  };

  return (
    <div
      onClick={onOpenFullPlayer}
      className="md:hidden fixed bottom-16 left-2 right-2 z-30 bg-zinc-900/95 border border-zinc-800 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform select-none"
    >
      {/* Top progress indicator */}
      <div className="w-full h-1 bg-zinc-800/80">
        <div
          className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between px-3 py-2 gap-3">
        {/* Thumbnail & Track details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/60 overflow-hidden shrink-0 flex items-center justify-center">
            {currentTrack?.thumbnail_url ? (
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Music className="w-5 h-5 text-zinc-500" />
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Disc3 className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-zinc-100 truncate leading-tight">
              {currentTrack?.title || 'Tidak Ada Lagu'}
            </div>
            <div className="text-[11px] text-zinc-400 truncate mt-0.5 flex items-center gap-1.5">
              <span>{currentTrack?.artist || 'YouTube Music'}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 font-mono text-[10px]">{playerState.volume}%</span>
            </div>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleToggle}
            className="w-9 h-9 rounded-full bg-red-600 text-white flex items-center justify-center active:scale-90 transition shadow-md shadow-red-600/30"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={handleNext}
            className="p-2 text-zinc-400 hover:text-white active:scale-90 transition"
            title="Lagu Berikutnya"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
