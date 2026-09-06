import { Music, Disc3, SlidersHorizontal } from 'lucide-react';
import { PlayerState } from '../../types/player';
import { Controls } from './Controls';
import { ProgressBar } from './ProgressBar';
import { VolumeSlider } from './VolumeSlider';

interface PlayerBarProps {
  playerState: PlayerState;
  onOpenEqualizer?: () => void;
  onOpenVolume?: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ playerState, onOpenEqualizer, onOpenVolume }) => {
  const currentTrack = playerState.current_track;
  const hasTrack = Boolean(currentTrack && currentTrack.video_id);

  return (
    <footer className="hidden md:flex h-20 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-6 items-center justify-between gap-4 shrink-0 z-30 shadow-2xl">
      {/* Current Song Info (Left) */}
      <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
        <div className="relative w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0 shadow-md">
          {currentTrack?.thumbnail_url ? (
            <img
              src={currentTrack.thumbnail_url}
              alt={currentTrack.title}
              className={`w-full h-full object-cover ${playerState.is_playing ? 'animate-pulse' : ''}`}
            />
          ) : (
            <Music className="w-5 h-5 text-zinc-500" />
          )}
          {playerState.is_playing && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <Disc3 className="w-6 h-6 text-white/80 animate-spin" />
            </div>
          )}
        </div>

        <div className="truncate flex-1">
          <div className="font-semibold text-sm text-zinc-100 truncate">
            {currentTrack?.title || 'No Track Playing'}
          </div>
          <div className="text-xs text-zinc-400 truncate mt-0.5">
            {currentTrack?.artist || 'Select a song or playlist'}
          </div>
        </div>
      </div>

      {/* Playback Controls & Progress Bar (Center) */}
      <div className="flex flex-col items-center justify-center w-2/4 max-w-xl">
        <Controls
          isPlaying={playerState.is_playing}
          repeatMode={playerState.repeat_mode || 'off'}
          autoplay={playerState.autoplay ?? true}
          disabled={!hasTrack && playerState.is_idle}
        />
        <div className="w-full mt-1.5">
          <ProgressBar
            currentTime={playerState.current_time}
            duration={playerState.duration}
            disabled={!hasTrack && playerState.is_idle}
          />
        </div>
      </div>

      {/* Hardware Volume & Equalizer (Right) */}
      <div className="flex items-center justify-end gap-2.5 w-1/4">
        {onOpenEqualizer && (
          <button
            onClick={onOpenEqualizer}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition active:scale-95"
            title="Equalizer & Sound Enhancer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        )}
        <VolumeSlider volume={playerState.volume} onOpenVolumeModal={onOpenVolume} />
      </div>
    </footer>
  );
};
