import React from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Repeat, Repeat1 } from 'lucide-react';
import { api } from '../../services/api';

interface ControlsProps {
  isPlaying: boolean;
  repeatMode: 'off' | 'all' | 'one';
  disabled?: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  isPlaying,
  repeatMode,
  disabled = false,
}) => {
  const handleToggle = async () => {
    try {
      await api.togglePlayPause();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStop = async () => {
    try {
      await api.stop();
    } catch (e) {
      console.error(e);
    }
  };

  const handleNext = async () => {
    try {
      await api.nextTrack();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrevious = async () => {
    try {
      await api.previousTrack();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCycleRepeat = async () => {
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    try {
      await api.setRepeatMode(nextMode);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      {/* Repeat Button */}
      <button
        onClick={handleCycleRepeat}
        disabled={disabled}
        title={
          repeatMode === 'one'
            ? 'Repeat: Satu Lagu (Looping lagu ini)'
            : repeatMode === 'all'
            ? 'Repeat: Semua (Looping playlist)'
            : 'Repeat: Mati'
        }
        className={`p-1.5 rounded-full transition ${
          repeatMode === 'one'
            ? 'text-red-500 bg-red-950/40 border border-red-800/60'
            : repeatMode === 'all'
            ? 'text-red-500 hover:bg-zinc-800'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
        } disabled:opacity-40`}
      >
        {repeatMode === 'one' ? (
          <Repeat1 className="w-4 h-4" />
        ) : (
          <Repeat className="w-4 h-4" />
        )}
      </button>

      {/* Stop */}
      <button
        onClick={handleStop}
        disabled={disabled}
        title="Stop"
        className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition disabled:opacity-40"
      >
        <Square className="w-4 h-4 fill-current" />
      </button>

      {/* Previous */}
      <button
        onClick={handlePrevious}
        disabled={disabled}
        title="Previous Track"
        className="p-1.5 text-zinc-200 hover:text-white hover:scale-110 transition disabled:opacity-40"
      >
        <SkipBack className="w-5 h-5 fill-current" />
      </button>

      {/* Play / Pause */}
      <button
        onClick={handleToggle}
        disabled={disabled}
        title={isPlaying ? 'Pause' : 'Play'}
        className="w-10 h-10 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 hover:scale-105 active:scale-95 transition disabled:opacity-40"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Next */}
      <button
        onClick={handleNext}
        disabled={disabled}
        title="Next Track"
        className="p-1.5 text-zinc-200 hover:text-white hover:scale-110 transition disabled:opacity-40"
      >
        <SkipForward className="w-5 h-5 fill-current" />
      </button>
    </div>
  );
};

