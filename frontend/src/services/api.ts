import { PlayerState, SearchResult, TrackInfo, EqualizerState, EqualizerBand, RecommendationResponse, QueueResponse } from '../types/player';
import { PlaylistDetail, PlaylistSummary, CreatePlaylistInput, AddSongInput, PlaylistSong } from '../types/playlist';

const BASE_URL = '/api';

export const api = {
  // --- Player APIs ---
  async getPlayerStatus(): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/status`);
    if (!res.ok) throw new Error('Failed to fetch player status');
    return res.json();
  },

  async playSong(track: { video_id: string; title: string; artist?: string; thumbnail_url?: string | null; duration?: number }): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/play`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(track),
    });
    if (!res.ok) throw new Error('Failed to play song');
    return res.json();
  },

  async playPlaylist(playlistId: number, startIndex: number = 0): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/play-playlist/${playlistId}?start_index=${startIndex}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to play playlist');
    return res.json();
  },

  async togglePlayPause(): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/toggle`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle play/pause');
    return res.json();
  },

  async stop(): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop playback');
    return res.json();
  },

  async nextTrack(): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/next`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to skip track');
    return res.json();
  },

  async previousTrack(): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/previous`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to go to previous track');
    return res.json();
  },

  async seek(position: number): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/seek`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position }),
    });
    if (!res.ok) throw new Error('Failed to seek track');
    return res.json();
  },

  async setHardwareVolume(volume: number): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume }),
    });
    if (!res.ok) throw new Error('Failed to set volume');
    return res.json();
  },

  async setRepeatMode(mode: 'off' | 'all' | 'one'): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/repeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) throw new Error('Failed to set repeat mode');
    return res.json();
  },

  async setAutoplay(enabled: boolean): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/autoplay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error('Failed to set autoplay mode');
    return res.json();
  },

  async getQueue(): Promise<QueueResponse> {
    const res = await fetch(`${BASE_URL}/player/queue`);
    if (!res.ok) throw new Error('Failed to fetch player queue');
    return res.json();
  },

  async playQueueIndex(index: number): Promise<PlayerState> {
    const res = await fetch(`${BASE_URL}/player/queue/play/${index}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to play queue track');
    return res.json();
  },

  // --- Playlists APIs ---
  async getPlaylists(): Promise<PlaylistSummary[]> {
    const res = await fetch(`${BASE_URL}/playlists`);
    if (!res.ok) throw new Error('Failed to fetch playlists');
    return res.json();
  },

  async createPlaylist(input: CreatePlaylistInput): Promise<PlaylistSummary> {
    const res = await fetch(`${BASE_URL}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('Failed to create playlist');
    return res.json();
  },

  async getPlaylistDetail(playlistId: number): Promise<PlaylistDetail> {
    const res = await fetch(`${BASE_URL}/playlists/${playlistId}`);
    if (!res.ok) throw new Error('Failed to fetch playlist details');
    return res.json();
  },

  async deletePlaylist(playlistId: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/playlists/${playlistId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete playlist');
  },

  async addSongToPlaylist(playlistId: number, song: AddSongInput): Promise<PlaylistSong> {
    const res = await fetch(`${BASE_URL}/playlists/${playlistId}/songs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(song),
    });
    if (!res.ok) throw new Error('Failed to add song to playlist');
    return res.json();
  },

  async removeSongFromPlaylist(playlistId: number, songId: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove song from playlist');
  },

  async downloadAllSongs(playlistId: number): Promise<{ message: string; count: number }> {
    const res = await fetch(`${BASE_URL}/playlists/${playlistId}/download-all`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger download all');
    return res.json();
  },

  async downloadSong(playlistId: number, songId: number): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/playlists/${playlistId}/songs/${songId}/download`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to trigger song download');
    return res.json();
  },

  // --- Search & Resolve APIs ---
  async search(query: string, limit: number = 20, offset: number = 0): Promise<SearchResult[]> {
    if (!query.trim()) return [];
    const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
    if (!res.ok) throw new Error('Failed to search songs');
    return res.json();
  },

  async resolveUrl(url: string): Promise<SearchResult> {
    const res = await fetch(`${BASE_URL}/search/resolve?url=${encodeURIComponent(url)}`);
    if (!res.ok) throw new Error('Failed to resolve URL');
    return res.json();
  },

  // --- Equalizer APIs ---
  async getEqualizer(): Promise<EqualizerState> {
    const res = await fetch(`${BASE_URL}/player/equalizer`);
    if (!res.ok) throw new Error('Failed to fetch equalizer settings');
    return res.json();
  },

  async updateEqualizer(payload: {
    bands?: EqualizerBand[];
    normalizer_enabled?: boolean;
    stereo_widen?: boolean;
  }): Promise<EqualizerState> {
    const res = await fetch(`${BASE_URL}/player/equalizer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update equalizer');
    return res.json();
  },

  async setEqualizerPreset(preset: string): Promise<EqualizerState> {
    const res = await fetch(`${BASE_URL}/player/equalizer/preset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preset }),
    });
    if (!res.ok) throw new Error('Failed to apply preset');
    return res.json();
  },

  // --- Recommendations API ---
  async getRecommendations(category?: string, limit: number = 18, offset: number = 0): Promise<RecommendationResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (category) {
      params.append('category', category);
    }
    const res = await fetch(`${BASE_URL}/search/recommendations?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return res.json();
  }
};

