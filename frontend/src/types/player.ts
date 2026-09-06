export interface TrackInfo {
  video_id?: string | null;
  title: string;
  artist: string;
  thumbnail_url?: string | null;
  duration: number;
}

export interface PlayerState {
  is_playing: boolean;
  is_paused: boolean;
  is_idle: boolean;
  current_time: number;
  duration: number;
  volume: number; // 0 to 100
  repeat_mode: 'off' | 'all' | 'one';
  current_track: TrackInfo | null;
  playlist_id?: number | null;
  queue_length: number;
}

export interface SearchResult {
  video_id: string;
  title: string;
  artist: string;
  thumbnail_url?: string | null;
  duration: number;
  duration_text?: string;
}

export interface EqualizerBand {
  frequency: number;
  gain: number; // -12 to 12 dB
}

export interface PresetInfo {
  name: string;
  description: string;
}

export interface EqualizerState {
  preset: string;
  bands: EqualizerBand[];
  normalizer_enabled: boolean;
  stereo_widen: boolean;
  available_presets: Record<string, PresetInfo>;
}

