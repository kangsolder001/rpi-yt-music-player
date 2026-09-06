import React from 'react';
import {
  ChevronDown,
  Music,
  Disc3,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  Repeat,
  Repeat1,
  Volume2,
  Volume1,
  VolumeX,
  Plus,
  Radio,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  ListMusic,
} from 'lucide-react';
import { PlayerState } from '../../types/player';
import { api } from '../../services/api';

interface MobileFullPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  onAddToPlaylist?: () => void;
  onOpenEqualizer?: () => void;
  onOpenQueue?: () => void;
  onOpenSystemHealth?: () => void;
}

export const MobileFullPlayer: React.FC<MobileFullPlayerProps> = ({
  isOpen,
  onClose,
  playerState,
  onAddToPlaylist,
  onOpenEqualizer,
  onOpenQueue,
  onOpenSystemHealth,
}) => {
  if (!isOpen) return null;

  const currentTrack = playerState.current_track;
  const isPlaying = playerState.is_playing;
  const repeatMode = playerState.repeat_mode || 'off';
  const autoplay = playerState.autoplay ?? true;
  const duration = playerState.duration || 0;
  const currentTime = playerState.current_time || 0;
  const volume = playerState.volume;

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    api.seek(ratio * duration).catch(console.error);
  };

  const handleTogglePlay = () => api.togglePlayPause().catch(console.error);
  const handleNext = () => api.nextTrack().catch(console.error);
  const handlePrevious = () => api.previousTrack().catch(console.error);
  const handleStop = () => api.stop().catch(console.error);

  const handleCycleRepeat = () => {
    const nextMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    api.setRepeatMode(nextMode).catch(console.error);
  };

  const handleVolumeChange = (newVal: number) => {
    const clamped = Math.max(0, Math.min(100, newVal));
    api.setHardwareVolume(clamped).catch(console.error);
  };

  const toggleMute = () => {
    if (volume > 0) {
      handleVolumeChange(0);
    } else {
      handleVolumeChange(75);
    }
  };

  const handleToggleAutoplay = async () => {
    try {
      await api.setAutoplay(!autoplay);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-zinc-900 via-zinc-950 to-black text-white flex flex-col justify-between p-6 overflow-y-auto animate-in fade-in slide-in-from-bottom duration-300">
      
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onClose}
          className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/40 active:scale-95 transition"
          aria-label="Tutup Player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        <button
          type="button"
          onClick={onOpenSystemHealth}
          className="flex flex-col items-center group active:scale-95 transition"
          title="Lihat status kesehatan hardware Raspberry Pi"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-200">
            Sedang Memutar di RPi
          </span>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Speaker Jack 3.5mm</span>
            <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400 font-normal underline decoration-dotted">
              📊 Status
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {onOpenQueue && (
            <button
              onClick={onOpenQueue}
              className="relative p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/40 active:scale-95 transition"
              title="Antrean Lagu Berikutnya (Up Next)"
            >
              <ListMusic className="w-5 h-5" />
              {playerState.queue_length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {playerState.queue_length}
                </span>
              )}
            </button>
          )}

          {onOpenEqualizer && (
            <button
              onClick={onOpenEqualizer}
              className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/40 active:scale-95 transition"
              title="Equalizer & Sound Enhancer"
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          )}

          {onAddToPlaylist && (
            <button
              onClick={onAddToPlaylist}
              className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/40 active:scale-95 transition"
              title="Simpan ke Playlist"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Album Artwork */}
      <div className="my-auto py-6 flex flex-col items-center justify-center">
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 max-w-[75vw] max-h-[75vw] rounded-3xl overflow-hidden shadow-2xl shadow-red-950/50 border border-zinc-800/80 bg-zinc-900 flex items-center justify-center">
          {currentTrack?.thumbnail_url ? (
            <img
              src={currentTrack.thumbnail_url}
              alt={currentTrack.title}
              className={`w-full h-full object-cover ${isPlaying ? 'scale-105' : 'scale-100'} transition-transform duration-700`}
            />
          ) : (
            <Music className="w-20 h-20 text-zinc-600" />
          )}

          {isPlaying && (
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
              <Disc3 className="w-16 h-16 text-white/70 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Track Info & Actions */}
      <div className="space-y-6 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="truncate flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate leading-snug">
              {currentTrack?.title || 'Tidak Ada Lagu'}
            </h2>
            <p className="text-sm sm:text-base text-zinc-400 truncate mt-1">
              {currentTrack?.artist || 'Pilih lagu untuk memulai'}
            </p>
          </div>
          {currentTrack && (
            <div className="shrink-0 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-[11px] text-zinc-300">
                <Radio className="w-3 h-3 text-red-500" />
                <span>ALSA PCM</span>
              </span>
            </div>
          )}
        </div>

        {/* Scrubber Timeline */}
        <div className="space-y-2">
          <div
            onClick={handleSeek}
            onTouchStart={handleSeek}
            className="w-full h-4 flex items-center cursor-pointer group select-none py-1"
          >
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-red-600 rounded-full group-hover:bg-red-500 transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between text-xs font-mono text-zinc-400 select-none">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-between px-2">
          {/* Repeat */}
          <button
            onClick={handleCycleRepeat}
            className={`p-3 rounded-full transition active:scale-90 ${
              repeatMode === 'one'
                ? 'text-red-400 bg-red-950/60 border border-red-800/80 shadow-md shadow-red-900/40'
                : repeatMode === 'all'
                ? 'text-red-400 bg-zinc-800/80'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title={`Repeat: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>

          {/* Previous */}
          <button
            onClick={handlePrevious}
            className="p-3 text-zinc-200 hover:text-white active:scale-90 transition"
            title="Lagu Sebelumnya"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={handleTogglePlay}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-xl shadow-red-600/40 active:scale-95 transition"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          {/* Next */}
          <button
            onClick={handleNext}
            className="p-3 text-zinc-200 hover:text-white active:scale-90 transition"
            title="Lagu Berikutnya"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          {/* Autoplay Radio Toggle */}
          <button
            onClick={handleToggleAutoplay}
            className={`p-3 rounded-full transition active:scale-90 ${
              autoplay
                ? 'text-amber-400 bg-amber-950/40 border border-amber-800/60 shadow-md shadow-amber-950/30'
                : 'text-zinc-600 hover:text-zinc-400'
            }`}
            title={`Autoplay Rekomendasi: ${autoplay ? 'Aktif' : 'Mati'}`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>

        {/* Hardware Volume Control Slider */}
        <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-2xl p-3.5 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>Hardware Volume ALSA</span>
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{volume}%</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="p-1.5 text-zinc-400 hover:text-white active:scale-90 transition"
            >
              {volume === 0 ? (
                <VolumeX className="w-5 h-5 text-red-400" />
              ) : volume < 50 ? (
                <Volume1 className="w-5 h-5 text-emerald-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleVolumeChange(volume - 5)}
                className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-lg active:scale-95"
              >
                -5
              </button>
              <button
                onClick={() => handleVolumeChange(volume + 5)}
                className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs rounded-lg active:scale-95"
              >
                +5
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
