import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Cpu,
  HardDrive,
  Clock,
  Globe,
  RefreshCw,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Zap,
} from 'lucide-react';
import { api } from '../../services/api';
import { SystemHealthResponse } from '../../types/system';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemHealthModal: React.FC<SystemHealthModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<SystemHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchHealth = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const res = await api.getSystemHealth();
      setData(res);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString('id-ID'));
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchHealth(true);
      const timer = setInterval(() => {
        fetchHealth(false);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isOpen, fetchHealth]);

  if (!isOpen) return null;

  // CPU temp coloring & badge
  const getTempColor = (temp: number | null, status: string) => {
    if (temp === null) return { text: 'text-zinc-400', bg: 'bg-zinc-800', bar: 'bg-zinc-500', label: 'Tidak Diketahui' };
    if (status === 'hot') {
      return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', bar: 'bg-red-500', label: 'Panas (Periksa Kipas)' };
    }
    if (status === 'warm') {
      return { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', bar: 'bg-amber-500', label: 'Hangat (Wajar)' };
    }
    return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', bar: 'bg-emerald-500', label: 'Optimal / Dingin' };
  };

  const tempColor = getTempColor(data?.cpu_temp ?? null, data?.cpu_temp_status ?? 'normal');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Kesehatan Raspberry Pi
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                  RPi 4
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {data ? `${data.hostname} • ${data.ip_address}:8000` : 'Memuat status hardware...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchHealth(true)}
              disabled={isLoading}
              className={`p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-800 hover:bg-zinc-700 transition ${
                isLoading ? 'animate-spin text-red-500' : ''
              }`}
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {!data && isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-red-500" />
              <p className="text-sm">Membaca sensor suhu dan resource Linux...</p>
            </div>
          ) : data ? (
            <>
              {/* CPU Temperature Card */}
              <div className={`p-4 rounded-xl border ${tempColor.bg} transition`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Flame className={`w-5 h-5 ${tempColor.text}`} />
                    <span className="text-sm font-semibold text-zinc-200">Suhu Prosesor (CPU)</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tempColor.bg} ${tempColor.text}`}>
                    {tempColor.label}
                  </span>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className={`text-3xl font-extrabold ${tempColor.text}`}>
                    {data.cpu_temp !== null ? `${data.cpu_temp}°C` : 'N/A'}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Batas aman &lt; 70°C (Throttle di 85°C)
                  </span>
                </div>

                {/* Progress bar temp up to 85°C */}
                <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${tempColor.bar}`}
                    style={{ width: `${Math.min(100, Math.max(0, ((data.cpu_temp || 40) / 85) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Grid: RAM & MicroSD Disk */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* RAM Card */}
                <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Activity className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">RAM Memory</span>
                    </div>
                    <span className="text-xs font-bold text-blue-400">{data.ram.percent}%</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-1">
                    {data.ram.used_mb} <span className="text-xs font-normal text-zinc-400">/ {data.ram.total_mb} MB</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mb-2">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, data.ram.percent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Tersedia:</span>
                    <span className="text-zinc-200 font-medium">{data.ram.free_mb} MB</span>
                  </p>
                </div>

                {/* Disk Card */}
                <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <HardDrive className="w-4 h-4" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">MicroSD Storage</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{data.disk.percent}%</span>
                  </div>
                  <div className="text-xl font-bold text-white mb-1">
                    {data.disk.used_gb} <span className="text-xs font-normal text-zinc-400">/ {data.disk.total_gb} GB</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mb-2">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, data.disk.percent)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Sisa Ruang:</span>
                    <span className="text-zinc-200 font-medium">{data.disk.free_gb} GB</span>
                  </p>
                </div>
              </div>

              {/* CPU Load & Core Info */}
              <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-purple-400">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                      Beban Kerja CPU ({data.cpu.cores} Core)
                    </span>
                  </div>
                  <span className="text-xs font-bold text-purple-400">{data.cpu.load_percent}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden mb-3">
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, data.cpu.load_percent)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-zinc-800/60">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">1 Menit</span>
                    <span className="text-xs font-bold text-zinc-300">{data.cpu.load_1m}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">5 Menit</span>
                    <span className="text-xs font-bold text-zinc-300">{data.cpu.load_5m}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">15 Menit</span>
                    <span className="text-xs font-bold text-zinc-300">{data.cpu.load_15m}</span>
                  </div>
                </div>
              </div>

              {/* Uptime & Network Footer Info */}
              <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-zinc-300">
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>
                    Aktif: <strong className="text-white font-semibold">{data.uptime.uptime_readable}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    IP: <strong className="text-white font-semibold">{data.ip_address}</strong>
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-zinc-400">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm">Gagal memuat status sistem dari Raspberry Pi.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between text-xs text-zinc-500">
          <span>Pembaruan otomatis tiap 5 detik {lastUpdated && `• Terakhir: ${lastUpdated}`}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

