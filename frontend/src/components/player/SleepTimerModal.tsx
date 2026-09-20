import React, { useState } from 'react';
import { X, Moon, Clock, Volume2, ShieldCheck, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { PlayerState } from '../../types/player';
import { api } from '../../services/api';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
  onTimerChanged?: (newState: PlayerState) => void;
}

const PRESETS = [
  { hours: 1, minutes: 60, label: '1 Jam' },
  { hours: 2, minutes: 120, label: '2 Jam' },
  { hours: 3, minutes: 180, label: '3 Jam' },
  { hours: 4, minutes: 240, label: '4 Jam' },
  { hours: 5, minutes: 300, label: '5 Jam' },
];

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  playerState,
  onTimerChanged,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isActive = Boolean(playerState.is_sleep_timer_active);
  const remainingSeconds = playerState.sleep_timer_remaining ?? 0;

  const formatCountdown = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDurationText = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h} Jam ${m} Menit`;
    if (h > 0) return `${h} Jam`;
    return `${m} Menit`;
  };

  const handleStartTimer = async (minutesToSet: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await api.setSleepTimer(minutesToSet, 60);
      if (onTimerChanged) onTimerChanged(newState);
    } catch (err: any) {
      setError('Gagal mengaktifkan sleep timer');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTimer = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newState = await api.cancelSleepTimer();
      if (onTimerChanged) onTimerChanged(newState);
    } catch (err: any) {
      setError('Gagal membatalkan sleep timer');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6 overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-44 h-44 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-44 h-44 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-2xl shadow-inner">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-1.5">
                <span>Mode Tidur (Sleep Timer)</span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </h3>
              <p className="text-xs text-zinc-400">
                Otomatis berhenti & mereda perlahan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-900/60 rounded-2xl text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* ACTIVE TIMER VIEW */}
        {isActive ? (
          <div className="space-y-5 relative z-10">
            <div className="p-6 bg-gradient-to-b from-indigo-950/40 to-zinc-950/60 border border-indigo-900/40 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 shadow-lg shadow-indigo-950/20">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Timer Sedang Berjalan</span>
              </div>

              {/* Digital countdown */}
              <div className="font-mono text-4xl sm:text-5xl font-extrabold text-white tracking-wider tabular-nums drop-shadow-md">
                {formatCountdown(remainingSeconds)}
              </div>

              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                Pemutar musik akan otomatis <strong className="text-zinc-200">berhenti</strong> saat hitungan waktu di atas mencapai nol.
              </p>
            </div>

            {/* Smooth Fade-Out info box */}
            <div className="p-3.5 bg-zinc-800/40 border border-zinc-800 rounded-2xl flex items-start gap-3 text-xs text-zinc-300">
              <Volume2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-200">Fitur Smooth Fade-Out Aktif</span>
                <p className="text-zinc-400 leading-normal text-[11px]">
                  Volume speaker akan diturunkan secara halus selama 60 detik terakhir sebelum berhenti agar telinga Anda tetap nyaman dan tidak kaget.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleCancelTimer}
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-2xl bg-red-600/20 hover:bg-red-600 border border-red-500/40 hover:border-red-500 text-red-300 hover:text-white font-semibold text-xs transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>Batalkan Sleep Timer</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition active:scale-95"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          /* INACTIVE: SELECT PRESETS VIEW */
          <div className="space-y-5 relative z-10">
            {/* Quick Presets (1 to 5 Jam) */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Pilih Durasi Cepat (1 - 5 Jam)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset) => {
                  const isSelected = selectedMinutes === preset.minutes;
                  return (
                    <button
                      key={preset.minutes}
                      type="button"
                      onClick={() => setSelectedMinutes(preset.minutes)}
                      className={`py-3 px-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 active:scale-95 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/60 text-zinc-300'
                      }`}
                    >
                      <span className="text-sm">{preset.label}</span>
                      <span className={`text-[10px] font-normal ${isSelected ? 'text-indigo-200' : 'text-zinc-500'}`}>
                        {preset.minutes} menit
                      </span>
                    </button>
                  );
                })}

                {/* Custom Button / Selector */}
                <button
                  type="button"
                  onClick={() => setSelectedMinutes(90)}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 active:scale-95 ${
                    selectedMinutes === 90
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-zinc-800/60 hover:bg-zinc-800 border-zinc-700/60 text-zinc-300'
                  }`}
                >
                  <span className="text-sm">1.5 Jam</span>
                  <span className={`text-[10px] font-normal ${selectedMinutes === 90 ? 'text-indigo-200' : 'text-zinc-500'}`}>
                    90 menit
                  </span>
                </button>
              </div>
            </div>

            {/* Custom Range Slider */}
            <div className="space-y-2 p-3.5 bg-zinc-800/40 border border-zinc-800 rounded-2xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Pengaturan Kustom:</span>
                <span className="font-bold text-indigo-400 font-mono">
                  {formatDurationText(selectedMinutes)}
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="300"
                step="15"
                value={selectedMinutes}
                onChange={(e) => setSelectedMinutes(Number(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>15 mnt</span>
                <span>1 Jam</span>
                <span>3 Jam</span>
                <span>5 Jam</span>
              </div>
            </div>

            {/* Feature Note Banner */}
            <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-2xl flex items-center gap-2.5 text-xs text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-[11px] leading-snug">
                Volume akan mereda secara perlahan (fade-out) 1 menit sebelum musik berhenti.
              </span>
            </div>

            {/* Start Timer Button */}
            <button
              type="button"
              onClick={() => handleStartTimer(selectedMinutes)}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 transition active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Moon className="w-4 h-4 fill-current" />
              )}
              <span>Aktifkan Sleep Timer ({formatDurationText(selectedMinutes)})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

