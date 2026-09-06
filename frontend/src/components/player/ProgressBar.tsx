import React from 'react';
import { api } from '../../services/api';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  disabled?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  disabled = false,
}) => {
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const percent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = clickRatio * duration;
    api.seek(targetSeconds).catch(console.error);
  };

  return (
    <div className="w-full flex items-center gap-2 text-[11px] text-zinc-400 font-mono select-none">
      <span className="w-10 text-right">{formatTime(currentTime)}</span>
      <div
        onClick={handleSeek}
        className={`flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden relative group ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
        }`}
      >
        <div
          className="h-full bg-red-600 rounded-full group-hover:bg-red-500 transition-all duration-150"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-10 text-left">{formatTime(duration)}</span>
    </div>
  );
};

