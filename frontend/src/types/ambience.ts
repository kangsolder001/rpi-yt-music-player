export interface AmbienceSoundscape {
  id: string;
  title: string;
  title_id: string;
  category: 'rain' | 'nature' | 'places' | 'noise' | 'lullaby';
  icon: string;
  gradient: string;
  accent_color: string;
  description: string;
  filename: string;
  tags: string[];
  is_available: boolean;
  file_size: number;
}

