import React, { useState, useEffect } from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { api } from '../../services/api';

interface VolumeSliderProps {
  volume: number;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({ volume }) => {
  const [localVolume, setLocalVolume] = useState<number>(volume);
  const [lastVolume, setLastVolume] = useState<number>(volume || 75);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setLocalVolume(val);
    api.setHardwareVolume(val).catch(console.error);
  };

  const toggleMute = () => {
    if (localVolume > 0) {
      setLastVolume(localVolume);
      setLocalVolume(0);
      api.setHardwareVolume(0).catch(console.error);
    } else {
      const restored = lastVolume > 0 ? lastVolume : 75;
      setLocalVolume(restored);
      api.setHardwareVolume(restored).catch(console.error);
    }
  };

  const renderIcon = () => {
    if (localVolume === 0) return <VolumeX className="w-4 h-4 text-red-400" />;
    if (localVolume < 50) return <Volume1 className="w-4 h-4 text-emerald-400" />;
    return <Volume2 className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div
      className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl shadow-inner select-none"
      title="Hardware ALSA Volume (Raspberry Pi 3.5mm Output)"
    >
      <button
        onClick={toggleMute}
        className="p-1 hover:bg-zinc-800 rounded-lg transition"
        title={localVolume === 0 ? 'Unmute' : 'Mute'}
      >
        {renderIcon()}
      </button>

      <input
        type="range"
        min="0"
        max="100"
        value={localVolume}
        onChange={handleChange}
        className="w-16 sm:w-24 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />

      <span className="text-xs font-mono font-semibold text-zinc-300 w-9 text-right">
        {localVolume}%
      </span>
    </div>
  );
};

