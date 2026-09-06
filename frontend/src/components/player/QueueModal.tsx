import React, { useState, useEffect } from 'react';
import { X, ListMusic, Music, Play, Disc3, Sparkles, Loader2, Radio } from 'lucide-react';
import { QueueResponse, QueueItem, PlayerState } from '../../types/player';
import { api } from '../../services/api';

interface QueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerState: PlayerState;
}

export const QueueModal: React.FC<QueueModalProps> = ({
  isOpen,
  onClose,
  playerState,
}) => {
  const [queueData, setQueueData] = useState<QueueResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen, playerState.current_track?.video_id, playerState.queue_length]);

  const loadQueue = async () => {
    setIsLoading(true);
    try {
      const data = await api.getQueue();
      setQueueData(data);
    } catch (e) {
      console.error('Failed to load queue', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayIndex = async (index: number) => {
    setIsSwitching(index);
    try {
      await api.playQueueIndex(index);
    } catch (e) {
      console.error('Failed to skip to track in queue', e);
    } finally {
      setIsSwitching(null);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const currentItem = queueData?.items.find((item) => item.is_current);
  const upcomingItems = queueData?.items.filter((item) => item.index > (queueData?.current_index ?? -1)) || [];
  const pastItems = queueData?.items.filter((item) => item.index < (queueData?.current_index ?? 0)) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <ListMusic className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-100">Antrean Lagu (Up Next)</h3>
                {queueData && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                    {queueData.total} lagu
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Rekomendasi Radio Otomatis YouTube Music</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {isLoading && !queueData ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <span className="text-xs">Memuat antrean lagu...</span>
            </div>
          ) : queueData && queueData.items.length > 0 ? (
            <>
              {/* CURRENTLY PLAYING SECTION */}
              {currentItem && (
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 animate-pulse text-red-500" />
                    <span>Sedang Diputar Sekarang</span>
                  </span>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900 border border-red-500/60 shadow-lg shadow-red-950/30 text-white gap-3.5">
                    <div className="relative w-14 h-14 rounded-xl bg-zinc-800 border border-zinc-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                      {currentItem.thumbnail_url ? (
                        <img
                          src={currentItem.thumbnail_url}
                          alt={currentItem.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-6 h-6 text-zinc-500" />
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Disc3 className="w-7 h-7 text-white animate-spin" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm text-red-400 truncate leading-snug">
                        {currentItem.title}
                      </div>
                      <div className="text-xs text-zinc-300 truncate mt-0.5">
                        {currentItem.artist}
                      </div>
                      {currentItem.duration > 0 && (
                        <div className="text-[11px] font-mono text-zinc-400 mt-1">
                          {formatTime(currentItem.duration)}
                        </div>
                      )}
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                      Now Playing
                    </span>
                  </div>
                </div>
              )}

              {/* UPCOMING TRACKS SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">
                    Berikutnya ({upcomingItems.length})
                  </span>
                  <span className="text-[11px] text-zinc-500 font-medium">Klik untuk langsung putar</span>
                </div>

                {upcomingItems.length > 0 ? (
                  <div className="divide-y divide-zinc-900 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 overflow-hidden">
                    {upcomingItems.map((item, relIdx) => {
                      const isThisSwitching = isSwitching === item.index;
                      return (
                        <div
                          key={`${item.video_id}-${item.index}`}
                          onClick={() => handlePlayIndex(item.index)}
                          className="flex items-center justify-between p-3 hover:bg-zinc-800/70 transition cursor-pointer select-none gap-3 group active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Number badge */}
                            <span className="w-5 text-center text-xs font-mono font-bold text-zinc-500 group-hover:text-red-400">
                              +{relIdx + 1}
                            </span>

                            {/* Thumbnail */}
                            <div className="relative w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/50 overflow-hidden shrink-0 flex items-center justify-center">
                              {item.thumbnail_url ? (
                                <img
                                  src={item.thumbnail_url}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Music className="w-5 h-5 text-zinc-500" />
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {isThisSwitching ? (
                                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                                ) : (
                                  <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                                )}
                              </div>
                            </div>

                            {/* Info */}
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-xs sm:text-sm text-zinc-200 group-hover:text-white truncate">
                                {item.title}
                              </div>
                              <div className="text-xs text-zinc-400 truncate mt-0.5">
                                {item.artist}
                              </div>
                            </div>
                          </div>

                          {/* Duration */}
                          <div className="shrink-0 text-right">
                            {item.duration > 0 && (
                              <span className="text-[11px] font-mono text-zinc-500 group-hover:text-zinc-300">
                                {formatTime(item.duration)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    Tidak ada lagu berikutnya di antrean. Autoplay akan mencarikan lagu sejenis saat lagu selesai.
                  </div>
                )}
              </div>

              {/* PAST TRACKS SECTION (Collapsible / History) */}
              {pastItems.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                    Sebelumnya ({pastItems.length})
                  </span>

                  <div className="divide-y divide-zinc-900 rounded-2xl bg-zinc-900/20 border border-zinc-800/40 overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
                    {pastItems.map((item) => (
                      <div
                        key={`${item.video_id}-${item.index}`}
                        onClick={() => handlePlayIndex(item.index)}
                        className="flex items-center justify-between p-2.5 hover:bg-zinc-800/50 transition cursor-pointer select-none gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/40 overflow-hidden shrink-0">
                            {item.thumbnail_url && (
                              <img
                                src={item.thumbnail_url}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-xs text-zinc-300 truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate">
                              {item.artist}
                            </div>
                          </div>
                        </div>
                        {item.duration > 0 && (
                          <span className="text-[10px] font-mono text-zinc-600">
                            {formatTime(item.duration)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <ListMusic className="w-12 h-12 mx-auto text-zinc-700" />
              <p className="text-sm font-semibold text-zinc-400">Antrean Lagu Kosong</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Pilih lagu dari halaman Explore atau Search untuk otomatis mengisi antrean rekomendasi lagu sejenis!
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sinkronisasi otomatis dengan pemutar Raspberry Pi</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
