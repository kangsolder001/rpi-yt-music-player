import React, { useState, useEffect } from 'react';
import { Radio, Sparkles, Plus, Compass, ListMusic, SlidersHorizontal } from 'lucide-react';
import { PlayerState, SearchResult } from './types/player';
import { PlaylistDetail as PlaylistDetailType, PlaylistSummary } from './types/playlist';
import { api } from './services/api';
import { playerWs } from './services/websocket';

import { PlaylistSidebar } from './components/playlist/PlaylistSidebar';
import { PlaylistDetail } from './components/playlist/PlaylistDetail';
import { MobilePlaylistDirectory } from './components/playlist/MobilePlaylistDirectory';
import { AddToPlaylistModal } from './components/playlist/AddToPlaylistModal';
import { SearchBar } from './components/search/SearchBar';
import { SearchResults } from './components/search/SearchResults';
import { ExploreRecommendations } from './components/search/ExploreRecommendations';
import { PlayerBar } from './components/player/PlayerBar';
import { MiniPlayer } from './components/player/MiniPlayer';
import { MobileFullPlayer } from './components/player/MobileFullPlayer';
import { MobileVolumeModal } from './components/player/MobileVolumeModal';
import { EqualizerModal } from './components/player/EqualizerModal';
import { QueueModal } from './components/player/QueueModal';
import { SystemHealthModal } from './components/system/SystemHealthModal';
import { BottomNav } from './components/navigation/BottomNav';

export const App: React.FC = () => {
  // Player state
  const [playerState, setPlayerState] = useState<PlayerState>({
    is_playing: false,
    is_paused: false,
    is_idle: true,
    current_time: 0,
    duration: 0,
    volume: 75,
    repeat_mode: 'off',
    current_track: null,
    playlist_id: null,
    queue_length: 0,
  });

  // Views & Navigation
  const [currentView, setCurrentView] = useState<'explore' | 'playlist'>('explore');

  // Mobile & Audio Modals
  const [isMobileFullPlayerOpen, setIsMobileFullPlayerOpen] = useState(false);
  const [isMobileVolumeOpen, setIsMobileVolumeOpen] = useState(false);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isSystemHealthOpen, setIsSystemHealthOpen] = useState(false);

  // Playlists state
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [currentPlaylistDetail, setCurrentPlaylistDetail] = useState<PlaylistDetailType | null>(null);

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMoreSearch, setIsLoadingMoreSearch] = useState(false);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<SearchResult | null>(null);

  // Initial load & WebSocket subscription
  useEffect(() => {
    // 1. Fetch initial status & playlists
    api.getPlayerStatus().then(setPlayerState).catch(console.error);
    loadPlaylists();

    // 2. Connect WebSocket
    playerWs.connect();
    const unsubscribe = playerWs.subscribe((newState) => {
      setPlayerState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // When selected playlist changes, fetch detail
  useEffect(() => {
    if (selectedPlaylistId !== null) {
      api.getPlaylistDetail(selectedPlaylistId)
        .then(setCurrentPlaylistDetail)
        .catch(console.error);
    }
  }, [selectedPlaylistId]);

  const loadPlaylists = async () => {
    try {
      const list = await api.getPlaylists();
      setPlaylists(list);
      // Auto-select on desktop if nothing selected yet
      if (list.length > 0 && selectedPlaylistId === null && window.innerWidth >= 768) {
        setSelectedPlaylistId(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchQuery(query);
    setCurrentView('explore');
    try {
      // Check if it's a direct URL
      if (query.includes('youtube.com') || query.includes('youtu.be')) {
        const resolved = await api.resolveUrl(query);
        setSearchResults([resolved]);
        setHasMoreSearch(false);
      } else {
        const results = await api.search(query, 20, 0);
        setSearchResults(results);
        setHasMoreSearch(results.length >= 20);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMoreSearch = async () => {
    if (isLoadingMoreSearch || !hasMoreSearch || !searchQuery) return;
    setIsLoadingMoreSearch(true);
    try {
      const nextResults = await api.search(searchQuery, 20, searchResults.length);
      if (nextResults.length > 0) {
        setSearchResults((prev) => {
          const existingIds = new Set(prev.map((s) => s.video_id));
          const newItems = nextResults.filter((n) => !existingIds.has(n.video_id));
          return [...prev, ...newItems];
        });
        setHasMoreSearch(nextResults.length >= 20);
      } else {
        setHasMoreSearch(false);
      }
    } catch (e) {
      console.error('Failed to load more search results', e);
      setHasMoreSearch(false);
    } finally {
      setIsLoadingMoreSearch(false);
    }
  };

  const handleCreatePlaylist = async (name: string, description?: string) => {
    try {
      const created = await api.createPlaylist({ name, description });
      await loadPlaylists();
      setSelectedPlaylistId(created.id);
      setCurrentView('playlist');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePlaylist = async (id: number) => {
    try {
      await api.deletePlaylist(id);
      await loadPlaylists();
      if (selectedPlaylistId === id) {
        setSelectedPlaylistId(null);
        setCurrentPlaylistDetail(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlaySongFromSearch = async (song: SearchResult) => {
    try {
      await api.playSong({
        video_id: song.video_id,
        title: song.title,
        artist: song.artist,
        thumbnail_url: song.thumbnail_url,
        duration: song.duration,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlayAllInPlaylist = async (playlistId?: number) => {
    const targetId = playlistId || selectedPlaylistId;
    if (!targetId) return;
    try {
      await api.playPlaylist(targetId, 0);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlaySongInPlaylist = async (startIndex: number) => {
    if (!selectedPlaylistId) return;
    try {
      await api.playPlaylist(selectedPlaylistId, startIndex);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveSongFromPlaylist = async (songId: number) => {
    if (!selectedPlaylistId) return;
    try {
      await api.removeSongFromPlaylist(selectedPlaylistId, songId);
      const updated = await api.getPlaylistDetail(selectedPlaylistId);
      setCurrentPlaylistDetail(updated);
      loadPlaylists();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadAll = async () => {
    if (!selectedPlaylistId) return;
    try {
      await api.downloadAllSongs(selectedPlaylistId);
      const updated = await api.getPlaylistDetail(selectedPlaylistId);
      setCurrentPlaylistDetail(updated);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadSong = async (songId: number) => {
    if (!selectedPlaylistId) return;
    try {
      await api.downloadSong(selectedPlaylistId, songId);
      const updated = await api.getPlaylistDetail(selectedPlaylistId);
      setCurrentPlaylistDetail(updated);
    } catch (e) {
      console.error(e);
    }
  };

  // Poll playlist detail if any song is downloading
  useEffect(() => {
    if (!selectedPlaylistId || !currentPlaylistDetail) return;
    const isAnyDownloading = currentPlaylistDetail.songs.some(
      (s) => s.download_status === 'downloading' || s.download_status === 'pending'
    );
    if (!isAnyDownloading) return;

    const timer = setInterval(() => {
      api.getPlaylistDetail(selectedPlaylistId).then((data) => {
        setCurrentPlaylistDetail(data);
      }).catch(console.error);
    }, 2500);

    return () => clearInterval(timer);
  }, [selectedPlaylistId, currentPlaylistDetail]);

  const hasTrack = Boolean(playerState.current_track && playerState.current_track.video_id);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans select-none">
      
      {/* Top Header */}
      <header className="h-16 border-b border-zinc-800/80 flex items-center justify-between px-4 sm:px-6 bg-zinc-900/60 backdrop-blur shrink-0 gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
            <Radio className="w-5 h-5" />
          </div>

          <div>
            <h1 className="font-extrabold text-base sm:text-lg leading-tight tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
              RPi Music Box
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>RPi 4 ALSA Online</span>
            </div>
          </div>
        </div>

        {/* Global Search Bar (Desktop) */}
        <div className="flex-1 max-w-xl mx-4 hidden md:block">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEqualizerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 rounded-xl transition text-xs font-semibold shadow-sm"
            title="Equalizer & Sound Enhancer"
          >
            <SlidersHorizontal className="w-4 h-4 text-red-500" />
            <span className="hidden sm:inline">Equalizer</span>
          </button>

          <button
            onClick={() => {
              setSongToAddToPlaylist(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 rounded-xl transition text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 text-red-400" />
            <span className="hidden xs:inline">+ Link YouTube</span>
            <span className="xs:hidden">+ Link</span>
          </button>
          
          <span className="hidden sm:inline-block px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[11px]">
            Jack 3.5mm
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Desktop Sidebar (hidden on mobile) */}
        <div className="hidden md:flex">
          <PlaylistSidebar
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            currentView={currentView}
            onSelectPlaylist={(id) => {
              setSelectedPlaylistId(id);
              setCurrentView('playlist');
            }}
            onSelectExplore={() => {
              setCurrentView('explore');
            }}
            onCreatePlaylist={handleCreatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
            onOpenSystemHealth={() => setIsSystemHealthOpen(true)}
          />
        </div>

        {/* Workspace Content Panel */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-zinc-950">
          
          {/* Mobile Search Bar (Only shown on mobile explore view) */}
          {currentView === 'explore' && (
            <div className="p-4 md:hidden border-b border-zinc-800/80 sticky top-0 bg-zinc-950/90 backdrop-blur z-10">
              <SearchBar onSearch={handleSearch} isLoading={isSearching} />
            </div>
          )}

          {/* VIEW 1: EXPLORE & SEARCH */}
          {currentView === 'explore' && (
            <div className="p-4 sm:p-6 flex-1 pb-32 md:pb-6">
              {searchResults.length > 0 ? (
                <SearchResults
                  results={searchResults}
                  currentVideoId={playerState.current_track?.video_id}
                  onPlaySong={handlePlaySongFromSearch}
                  onAddToPlaylist={(song) => {
                    setSongToAddToPlaylist(song);
                    setIsAddModalOpen(true);
                  }}
                  onClearSearch={() => {
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                  hasMore={hasMoreSearch}
                  isLoadingMore={isLoadingMoreSearch}
                  onLoadMore={handleLoadMoreSearch}
                />
              ) : (
                <ExploreRecommendations
                  currentVideoId={playerState.current_track?.video_id}
                  onPlaySong={handlePlaySongFromSearch}
                  onAddToPlaylist={(song) => {
                    setSongToAddToPlaylist(song);
                    setIsAddModalOpen(true);
                  }}
                />
              )}
            </div>
          )}

          {/* VIEW 2: PLAYLISTS */}
          {currentView === 'playlist' && (
            <>
              {/* On Desktop, or on Mobile when a playlist is selected: Show PlaylistDetail */}
              {selectedPlaylistId && currentPlaylistDetail ? (
                <PlaylistDetail
                  playlist={currentPlaylistDetail}
                  currentVideoId={playerState.current_track?.video_id}
                  onPlayAll={() => handlePlayAllInPlaylist(selectedPlaylistId)}
                  onPlaySong={handlePlaySongInPlaylist}
                  onRemoveSong={handleRemoveSongFromPlaylist}
                  onOpenAddModal={() => {
                    setSongToAddToPlaylist(null);
                    setIsAddModalOpen(true);
                  }}
                  onDownloadAll={handleDownloadAll}
                  onDownloadSong={handleDownloadSong}
                  onBack={() => setSelectedPlaylistId(null)}
                />
              ) : (
                /* On Mobile when no playlist is selected: Show MobilePlaylistDirectory */
                <div className="flex-1">
                  <MobilePlaylistDirectory
                    playlists={playlists}
                    onSelectPlaylist={(id) => setSelectedPlaylistId(id)}
                    onCreatePlaylist={handleCreatePlaylist}
                    onDeletePlaylist={handleDeletePlaylist}
                    onPlayPlaylist={(id) => handlePlayAllInPlaylist(id)}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Desktop Persistent Player Bar */}
      <PlayerBar
        playerState={playerState}
        onOpenEqualizer={() => setIsEqualizerOpen(true)}
        onOpenVolume={() => setIsMobileVolumeOpen(true)}
        onOpenQueue={() => setIsQueueOpen(true)}
      />

      {/* Mobile Floating Mini Player (Visible above BottomNav when track exists) */}
      <MiniPlayer
        playerState={playerState}
        onOpenFullPlayer={() => setIsMobileFullPlayerOpen(true)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        currentView={currentView}
        onSelectExplore={() => setCurrentView('explore')}
        onSelectPlaylist={() => {
          setCurrentView('playlist');
        }}
        onOpenNowPlaying={() => setIsMobileFullPlayerOpen(true)}
        onOpenVolumeModal={() => setIsMobileVolumeOpen(true)}
        isPlaying={playerState.is_playing}
        hasTrack={hasTrack}
      />

      {/* Mobile Full Screen Now Playing Sheet */}
      <MobileFullPlayer
        isOpen={isMobileFullPlayerOpen}
        onClose={() => setIsMobileFullPlayerOpen(false)}
        playerState={playerState}
        onOpenEqualizer={() => setIsEqualizerOpen(true)}
        onOpenQueue={() => setIsQueueOpen(true)}
        onOpenSystemHealth={() => setIsSystemHealthOpen(true)}
        onAddToPlaylist={() => {
          if (playerState.current_track?.video_id) {
            setSongToAddToPlaylist({
              video_id: playerState.current_track.video_id,
              title: playerState.current_track.title,
              artist: playerState.current_track.artist,
              thumbnail_url: playerState.current_track.thumbnail_url || null,
              duration: playerState.duration || 0,
            });
            setIsAddModalOpen(true);
          }
        }}
      />

      {/* Mobile Hardware Volume Modal */}
      <MobileVolumeModal
        isOpen={isMobileVolumeOpen}
        onClose={() => setIsMobileVolumeOpen(false)}
        volume={playerState.volume}
      />

      {/* Up Next / Play Queue Modal */}
      <QueueModal
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        playerState={playerState}
      />

      {/* Equalizer & Audio Enhancer Modal */}
      <EqualizerModal
        isOpen={isEqualizerOpen}
        onClose={() => setIsEqualizerOpen(false)}
      />

      {/* Raspberry Pi System Health & Hardware Monitor Modal */}
      <SystemHealthModal
        isOpen={isSystemHealthOpen}
        onClose={() => setIsSystemHealthOpen(false)}
      />

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSongToAddToPlaylist(null);
        }}
        playlists={playlists}
        prefilledSong={songToAddToPlaylist}
        onSuccess={() => {
          loadPlaylists();
          if (selectedPlaylistId) {
            api.getPlaylistDetail(selectedPlaylistId)
              .then(setCurrentPlaylistDetail)
              .catch(console.error);
          }
        }}
      />
    </div>
  );
};

export default App;
