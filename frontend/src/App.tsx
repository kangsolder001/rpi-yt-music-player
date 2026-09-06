import React, { useState, useEffect } from 'react';
import { Radio, Sparkles, Menu, X, Plus } from 'lucide-react';
import { PlayerState, SearchResult } from './types/player';
import { PlaylistDetail as PlaylistDetailType, PlaylistSummary } from './types/playlist';
import { api } from './services/api';
import { playerWs } from './services/websocket';

import { PlaylistSidebar } from './components/playlist/PlaylistSidebar';
import { PlaylistDetail } from './components/playlist/PlaylistDetail';
import { AddToPlaylistModal } from './components/playlist/AddToPlaylistModal';
import { SearchBar } from './components/search/SearchBar';
import { SearchResults } from './components/search/SearchResults';
import { PlayerBar } from './components/player/PlayerBar';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Playlists state
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [currentPlaylistDetail, setCurrentPlaylistDetail] = useState<PlaylistDetailType | null>(null);

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
      if (list.length > 0 && selectedPlaylistId === null) {
        setSelectedPlaylistId(list[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setCurrentView('explore');
    try {
      // Check if it's a direct URL
      if (query.includes('youtube.com') || query.includes('youtu.be')) {
        const resolved = await api.resolveUrl(query);
        setSearchResults([resolved]);
      } else {
        const results = await api.search(query);
        setSearchResults(results);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
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
        setCurrentView('explore');
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

  const handlePlayAllInPlaylist = async () => {
    if (!selectedPlaylistId) return;
    try {
      await api.playPlaylist(selectedPlaylistId, 0);
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

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      
      {/* Top Header */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 bg-zinc-900/50 backdrop-blur shrink-0 gap-4 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
            <Radio className="w-5 h-5" />
          </div>

          <div>
            <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight">
              RPi Music Box
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>RPi 4 ALSA Online</span>
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-xl mx-2 hidden sm:block">
          <SearchBar onSearch={handleSearch} isLoading={isSearching} />
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => {
              setSongToAddToPlaylist(null);
              setIsAddModalOpen(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl transition text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Link YT</span>
          </button>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono text-[11px]">
            Jack 3.5mm
          </span>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`fixed md:static inset-y-0 left-0 z-40 md:z-auto transition-transform duration-200 ease-in-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <PlaylistSidebar
            playlists={playlists}
            selectedPlaylistId={selectedPlaylistId}
            currentView={currentView}
            onSelectPlaylist={(id) => {
              setSelectedPlaylistId(id);
              setCurrentView('playlist');
              setMobileMenuOpen(false);
            }}
            onSelectExplore={() => {
              setCurrentView('explore');
              setMobileMenuOpen(false);
            }}
            onCreatePlaylist={handleCreatePlaylist}
            onDeletePlaylist={handleDeletePlaylist}
          />
        </div>

        {/* Workspace Content Panel */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-zinc-950">
          
          {/* Mobile Search Bar */}
          <div className="p-4 sm:hidden border-b border-zinc-800">
            <SearchBar onSearch={handleSearch} isLoading={isSearching} />
          </div>

          {currentView === 'explore' && (
            <div className="p-4 sm:p-6 flex-1">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-red-500" />
                    <span>Explore & Search</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Cari lagu di YouTube Music atau paste link lagu langsung untuk diputar di Raspberry Pi.
                  </p>
                </div>
              </div>

              <SearchResults
                results={searchResults}
                currentVideoId={playerState.current_track?.video_id}
                onPlaySong={handlePlaySongFromSearch}
                onAddToPlaylist={(song) => {
                  setSongToAddToPlaylist(song);
                  setIsAddModalOpen(true);
                }}
              />
            </div>
          )}

          {currentView === 'playlist' && currentPlaylistDetail && (
            <PlaylistDetail
              playlist={currentPlaylistDetail}
              currentVideoId={playerState.current_track?.video_id}
              onPlayAll={handlePlayAllInPlaylist}
              onPlaySong={handlePlaySongInPlaylist}
              onRemoveSong={handleRemoveSongFromPlaylist}
              onOpenAddModal={() => {
                setSongToAddToPlaylist(null);
                setIsAddModalOpen(true);
              }}
              onDownloadAll={handleDownloadAll}
              onDownloadSong={handleDownloadSong}
            />
          )}

          {currentView === 'playlist' && !currentPlaylistDetail && (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Pilih playlist dari sidebar atau buat playlist baru.
            </div>
          )}
        </main>
      </div>

      {/* Bottom Persistent Player Bar */}
      <PlayerBar playerState={playerState} />

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

