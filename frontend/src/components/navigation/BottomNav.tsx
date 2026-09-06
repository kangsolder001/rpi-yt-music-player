import React from 'react';
import { Compass, ListMusic, Disc3, Volume2 } from 'lucide-react';

interface BottomNavProps {
  currentView: 'explore' | 'playlist';
  onSelectExplore: () => void;
  onSelectPlaylist: () => void;
  onOpenNowPlaying: () => void;
  onOpenVolumeModal: () => void;
  isPlaying: boolean;
  hasTrack: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onSelectExplore,
  onSelectPlaylist,
  onOpenNowPlaying,
  onOpenVolumeModal,
  isPlaying,
  hasTrack,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/95 border-t border-zinc-800/90 backdrop-blur-lg px-4 flex items-center justify-around z-20 select-none">
      {/* Tab 1: Explore */}
      <button
        onClick={onSelectExplore}
        className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition ${
          currentView === 'explore'
            ? 'text-red-500'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <Compass className={`w-5 h-5 ${currentView === 'explore' ? 'scale-110' : ''} transition-transform`} />
        <span className="text-[10px] font-medium tracking-tight">Explore</span>
      </button>

      {/* Tab 2: Playlists */}
      <button
        onClick={onSelectPlaylist}
        className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition ${
          currentView === 'playlist'
            ? 'text-red-500'
            : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <ListMusic className={`w-5 h-5 ${currentView === 'playlist' ? 'scale-110' : ''} transition-transform`} />
        <span className="text-[10px] font-medium tracking-tight">Playlists</span>
      </button>

      {/* Tab 3: Now Playing */}
      <button
        onClick={onOpenNowPlaying}
        disabled={!hasTrack}
        className={`flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition disabled:opacity-30 ${
          isPlaying ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
        }`}
      >
        <div className="relative">
          <Disc3 className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-zinc-950 animate-pulse" />
          )}
        </div>
        <span className="text-[10px] font-medium tracking-tight">Playing</span>
      </button>

      {/* Tab 4: Hardware Volume */}
      <button
        onClick={onOpenVolumeModal}
        className="flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl text-zinc-400 hover:text-zinc-200 transition"
      >
        <Volume2 className="w-5 h-5" />
        <span className="text-[10px] font-medium tracking-tight">Volume</span>
      </button>
    </nav>
  );
};
