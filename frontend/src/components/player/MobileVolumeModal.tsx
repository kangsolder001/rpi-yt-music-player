import React from 'react';
import { X, Volume2, Volume1, VolumeX, Radio } from 'lucide-react';
import { api } from '../../services/api';

interface MobileVolumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  volume: number;
}

export const MobileVolumeModal: React.FC<MobileVolumeModalProps> = ({
  isOpen,
  onClose,
  volume,
}) => {
  if (!isOpen) return null;

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

  const presets = [0, 25, 50, 75, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100">
                Hardware ALSA Volume
              </h3>
              <p className="text-xs text-zinc-400">
                Raspberry Pi 4 • Jack Audio 3.5mm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/60 active:scale-95 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Volume Level Display & Big Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={toggleMute}
              className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-200 transition flex items-center gap-2"
            >
              {volume === 0 ? (
                <>
                  <VolumeX className="w-5 h-5 text-red-400" />
                  <span className="text-xs font-semibold text-red-400">Muted</span>
                </>
              ) : volume < 50 ? (
                <>
                  <Volume1 className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-semibold">Active</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-semibold">Active</span>
                </>
              )}
            </button>

            <span className="font-mono text-3xl font-extrabold text-emerald-400">
              {volume}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
              className="flex-1 h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Quick Increment / Decrement */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => handleVolumeChange(volume - 5)}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 rounded-xl text-xs font-semibold transition"
            >
              -5%
            </button>
            <button
              onClick={() => handleVolumeChange(volume + 5)}
              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 rounded-xl text-xs font-semibold transition"
            >
              +5%
            </button>
          </div>

          {/* Presets */}
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 block mb-2">
              Preset Cepat:
            </span>
            <div className="grid grid-cols-5 gap-2">
              {presets.map((val) => (
                <button
                  key={val}
                  onClick={() => handleVolumeChange(val)}
                  className={`py-2 text-xs font-mono font-medium rounded-xl transition active:scale-95 ${
                    volume === val
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  {val}%
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-200 font-semibold text-sm rounded-xl transition"
        >
          Selesai
        </button>
      </div>
    </div>
  );
};
