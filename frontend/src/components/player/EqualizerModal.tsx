import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Sparkles, Volume2, RotateCcw, Waves, ShieldCheck } from 'lucide-react';
import { EqualizerState, EqualizerBand } from '../../types/player';
import { api } from '../../services/api';

interface EqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EqualizerModal: React.FC<EqualizerModalProps> = ({ isOpen, onClose }) => {
  const [eqState, setEqState] = useState<EqualizerState | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadEqualizer();
    }
  }, [isOpen]);

  const loadEqualizer = async () => {
    setLoading(true);
    try {
      const data = await api.getEqualizer();
      setEqState(data);
    } catch (e) {
      console.error('Failed to load equalizer', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePresetSelect = async (presetKey: string) => {
    try {
      const updated = await api.setEqualizerPreset(presetKey);
      setEqState(updated);
    } catch (e) {
      console.error('Failed to apply preset', e);
    }
  };

  const handleBandChange = async (index: number, newGain: number) => {
    if (!eqState) return;
    const newBands = eqState.bands.map((b, i) => (i === index ? { ...b, gain: newGain } : b));
    setEqState({ ...eqState, bands: newBands, preset: 'custom' });
    try {
      const updated = await api.updateEqualizer({ bands: newBands });
      setEqState(updated);
    } catch (e) {
      console.error('Failed to update band', e);
    }
  };

  const handleToggleNormalizer = async () => {
    if (!eqState) return;
    const newVal = !eqState.normalizer_enabled;
    setEqState({ ...eqState, normalizer_enabled: newVal });
    try {
      const updated = await api.updateEqualizer({ normalizer_enabled: newVal });
      setEqState(updated);
    } catch (e) {
      console.error('Failed to toggle normalizer', e);
    }
  };

  const handleToggleStereoWiden = async () => {
    if (!eqState) return;
    const newVal = !eqState.stereo_widen;
    setEqState({ ...eqState, stereo_widen: newVal });
    try {
      const updated = await api.updateEqualizer({ stereo_widen: newVal });
      setEqState(updated);
    } catch (e) {
      console.error('Failed to toggle stereo widen', e);
    }
  };

  const formatFreq = (hz: number) => {
    if (hz >= 1000) return `${hz / 1000}kHz`;
    return `${hz}Hz`;
  };

  const bandLabels: Record<number, string> = {
    60: 'Bass',
    250: 'Low-Mid',
    1000: 'Vocal',
    4000: 'Presence',
    12000: 'Treble',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-500 border border-red-800/40">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-zinc-100 flex items-center gap-2">
                <span>Equalizer & Sound Enhancer</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Filter audio real-time via FFmpeg & mpv
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

        {eqState && (
          <>
            {/* Presets Grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Preset Karakter Suara:
                </span>
                <button
                  onClick={() => handlePresetSelect('flat')}
                  className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition"
                  title="Kembalikan ke Flat"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Flat</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(eqState.available_presets).map(([key, info]) => {
                  const isActive = eqState.preset === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handlePresetSelect(key)}
                      className={`p-2.5 text-left rounded-xl border transition active:scale-95 ${
                        isActive
                          ? 'bg-red-600/20 border-red-500/80 text-white shadow-md shadow-red-950/40'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${isActive ? 'text-red-400' : 'text-zinc-200'}`}>
                          {info.name}
                        </span>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1">
                        {info.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5-Band Graphic Equalizer */}
            <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  5-Band Graphic EQ (Gain -12dB s/d +12dB):
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {eqState.preset === 'custom' ? 'Custom Tuning' : eqState.available_presets[eqState.preset]?.name || eqState.preset}
                </span>
              </div>

              {/* Vertical / Horizontal Sliders */}
              <div className="grid grid-cols-5 gap-2 pt-2">
                {eqState.bands.map((band, idx) => (
                  <div key={band.frequency} className="flex flex-col items-center space-y-2">
                    <span className="text-[10px] font-mono font-bold text-zinc-300">
                      {band.gain > 0 ? `+${band.gain}` : band.gain} dB
                    </span>

                    {/* Slider container */}
                    <div className="h-32 flex items-center justify-center py-1">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="1"
                        value={band.gain}
                        onChange={(e) => handleBandChange(idx, parseInt(e.target.value, 10))}
                        className="h-28 w-2 appearance-none bg-zinc-800 rounded-lg cursor-pointer accent-red-500 [writing-mode:bt-lr] [-webkit-appearance:slider-vertical]"
                      />
                    </div>

                    <div className="text-center">
                      <div className="text-[11px] font-mono font-bold text-zinc-200">
                        {formatFreq(band.frequency)}
                      </div>
                      <div className="text-[9px] text-zinc-500 uppercase tracking-tight">
                        {bandLabels[band.frequency] || ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sound Enhancers / Toggles */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                Efek Peningkatan Suara Tambahan:
              </span>

              {/* Toggle 1: Normalizer */}
              <div
                onClick={handleToggleNormalizer}
                className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 cursor-pointer active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${eqState.normalizer_enabled ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <span>Dynamic Audio Normalizer (`dynaudnorm`)</span>
                      {eqState.normalizer_enabled && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Ratakan volume antar lagu otomatis & cegah suara sember/pecah pada speaker mini.
                    </p>
                  </div>
                </div>

                <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${eqState.normalizer_enabled ? 'bg-emerald-600' : 'bg-zinc-800'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${eqState.normalizer_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Toggle 2: Stereo Widener */}
              <div
                onClick={handleToggleStereoWiden}
                className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 cursor-pointer active:scale-[0.99] transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${eqState.stereo_widen ? 'bg-indigo-950/60 border-indigo-700/60 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                    <Waves className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                      <span>Spatial Stereo Widener (`stereowiden`)</span>
                      {eqState.stereo_widen && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-800 rounded">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Melebarkan ruang suara stereo agar terkesan lebih megah dan lapang.
                    </p>
                  </div>
                </div>

                <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${eqState.stereo_widen ? 'bg-indigo-600' : 'bg-zinc-800'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${eqState.stereo_widen ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Footer Close */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/30 active:scale-98 transition"
        >
          Terapkan & Simpan
        </button>
      </div>
    </div>
  );
};
