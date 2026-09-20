import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  Droplets,
  Waves,
  Flame,
  MoonStar,
  Wind,
  Coffee,
  Headphones,
  Sparkles,
  Volume2,
  Play,
  Pause,
  Loader2,
  Moon,
  VolumeX,
  Volume1,
  CheckCircle2,
  Baby,
  Music,
  Heart
} from 'lucide-react';
import { AmbienceSoundscape } from '../../types/ambience';
import { PlayerState } from '../../types/player';
import { api } from '../../services/api';

interface AmbienceViewProps {
  playerState: PlayerState;
  onPlayAmbience: (id: string) => Promise<void>;
  onOpenSleepTimer: () => void;
  loadingId?: string | null;
}

export const AmbienceView: React.FC<AmbienceViewProps> = ({
  playerState,
  onPlayAmbience,
  onOpenSleepTimer,
  loadingId,
}) => {
  const [catalog, setCatalog] = useState<AmbienceSoundscape[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAmbienceCatalog();
      setCatalog(data);
    } catch (err) {
      console.error('Failed to load ambience catalog:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Render dynamic icon based on soundscape icon key
  const renderIcon = (iconName: string, className: string = "w-6 h-6") => {
    switch (iconName) {
      case 'CloudRain':
        return <CloudRain className={className} />;
      case 'Droplets':
        return <Droplets className={className} />;
      case 'Waves':
        return <Waves className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'MoonStar':
        return <MoonStar className={className} />;
      case 'Wind':
        return <Wind className={className} />;
      case 'Coffee':
        return <Coffee className={className} />;
      case 'Headphones':
        return <Headphones className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Baby':
        return <Baby className={className} />;
      case 'Music':
        return <Music className={className} />;
      case 'Heart':
        return <Heart className={className} />;
      case 'Volume2':
      default:
        return <Volume2 className={className} />;
    }
  };

  const categories = [
    { id: 'all', label: 'Semua Suasana' },
    { id: 'lullaby', label: '🧸 Lullaby & Musik Tidur' },
    { id: 'rain', label: '🌧️ Hujan & Badai' },
    { id: 'nature', label: '🌲 Alam & Ombak' },
    { id: 'noise', label: '📻 White / Brown Noise' },
    { id: 'places', label: '☕ Kafe & Tempat' },
  ];

  const filteredCatalog = catalog.filter((item) => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const query = searchFilter.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.title_id.toLowerCase().includes(query) ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.tags.some((t) => t.toLowerCase().includes(query));
    return matchesCat && matchesSearch;
  });

  // Current playing track check
  const currentVideoId = playerState.current_track?.video_id || '';
  const isAmbiencePlaying = currentVideoId.startsWith('ambience_') && playerState.is_playing && !playerState.is_paused;

  return (
    <div className="flex flex-col flex-1 p-4 sm:p-6 pb-32 md:pb-8 max-w-7xl mx-auto w-full">
      {/* Top Banner & Sleep Timer Quick Action */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-zinc-950 border border-indigo-900/40 p-6 sm:p-8 shadow-2xl mb-8">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>100% Offline & Infinite Loop di Raspberry Pi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Ambience & White Noise
            </h1>
            <p className="text-zinc-400 text-sm sm:text-base max-w-2xl leading-relaxed">
              Koleksi suara alam dan frekuensi relaksasi untuk membantu tidur lebih lelap, fokus kerja, atau meredam kebisingan di kamar.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onOpenSleepTimer}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition shadow-lg ${
                playerState.is_sleep_timer_active
                  ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-amber-500/10'
                  : 'bg-zinc-800/90 hover:bg-zinc-700/90 border border-zinc-700 text-zinc-100 hover:scale-[1.02] active:scale-95'
              }`}
            >
              <Moon className="w-4 h-4 text-amber-400" />
              <span>
                {playerState.is_sleep_timer_active && playerState.sleep_timer_remaining
                  ? `Timer: ${Math.ceil(playerState.sleep_timer_remaining / 60)}m`
                  : '🌙 Pasang Sleep Timer'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow'
                  : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-zinc-500 font-medium">
          Menampilkan {filteredCatalog.length} suara
        </div>
      </div>

      {/* Soundscape Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <p className="text-sm">Memuat daftar suara alam...</p>
        </div>
      ) : filteredCatalog.length === 0 ? (
        <div className="text-center py-20 text-zinc-500 space-y-2">
          <VolumeX className="w-10 h-10 mx-auto opacity-40 mb-2" />
          <p className="text-base font-semibold text-zinc-400">Tidak ada suara yang cocok</p>
          <p className="text-xs">Coba pilih kategori lain</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredCatalog.map((item) => {
            const isThisPlaying = currentVideoId === `ambience_${item.id}` && playerState.is_playing && !playerState.is_paused;
            const isThisLoading = loadingId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onPlayAmbience(item.id)}
                className={`group relative overflow-hidden rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer select-none bg-zinc-900/80 hover:bg-zinc-850 hover:shadow-xl hover:-translate-y-1 ${
                  isThisPlaying
                    ? 'border-indigo-500/80 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/20 bg-gradient-to-b from-indigo-950/40 to-zinc-900'
                    : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                {/* Background ambient gradient glow */}
                <div
                  className={`absolute -right-8 -top-8 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-20 group-hover:opacity-35 transition duration-500 ${
                    item.gradient ? `bg-gradient-to-tr ${item.gradient}` : 'bg-indigo-500'
                  }`}
                />

                {/* Card Top: Icon & Play Indicator */}
                <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition duration-300 shadow-md ${
                      isThisPlaying
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-indigo-500/30'
                        : 'bg-zinc-800/90 text-zinc-300 group-hover:text-white group-hover:scale-105'
                    }`}
                  >
                    {renderIcon(item.icon, "w-6 h-6")}
                  </div>

                  {/* Play / Pulse Equalizer Badge */}
                  <div className="flex items-center gap-1.5">
                    {isThisPlaying ? (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-xs font-semibold">
                        <span className="w-1.5 h-3.5 bg-indigo-400 rounded-full animate-[bounce_0.8s_infinite]" />
                        <span className="w-1.5 h-2 bg-indigo-400 rounded-full animate-[bounce_1.1s_infinite]" />
                        <span className="w-1.5 h-4 bg-indigo-400 rounded-full animate-[bounce_0.6s_infinite]" />
                        <span className="ml-1 text-[11px]">Memutar</span>
                      </div>
                    ) : isThisLoading ? (
                      <div className="p-2 rounded-full bg-zinc-800 text-zinc-300">
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800/80 group-hover:bg-red-600 group-hover:text-white flex items-center justify-center text-zinc-400 transition">
                        <Play className="w-4 h-4 ml-0.5 fill-current" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Middle: Titles & Description */}
                <div className="space-y-1.5 relative z-10 mb-4">
                  <h3 className="text-base font-bold text-zinc-100 group-hover:text-white line-clamp-1">
                    {item.title_id}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono line-clamp-1">
                    {item.title}
                  </p>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 pt-1">
                    {item.description}
                  </p>
                </div>

                {/* Card Bottom: Tags & Offline Ready Badge */}
                <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 relative z-10">
                  <span className="capitalize">{item.category}</span>
                  <div className="flex items-center gap-1 text-emerald-400/90 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Lokal Pi</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

