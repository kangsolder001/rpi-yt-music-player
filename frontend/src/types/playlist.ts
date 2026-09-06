export interface PlaylistSong {
  id: number;
  playlist_id: number;
  video_id: string;
  title: string;
  artist: string;
  thumbnail_url?: string | null;
  duration: number;
  order_index: number;
  added_at: string;
  is_downloaded?: boolean;
  file_path?: string | null;
  download_status?: 'none' | 'pending' | 'downloading' | 'completed' | 'failed';
}

export interface PlaylistSummary {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
  song_count: number;
}

export interface PlaylistDetail extends PlaylistSummary {
  songs: PlaylistSong[];
}

export interface CreatePlaylistInput {
  name: string;
  description?: string;
}

export interface AddSongInput {
  video_id: string;
  title?: string;
  artist?: string;
  thumbnail_url?: string | null;
  duration?: number;
}
