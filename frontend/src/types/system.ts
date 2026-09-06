export interface CpuHealth {
  cores: number;
  load_1m: number;
  load_5m: number;
  load_15m: number;
  load_percent: number;
}

export interface RamHealth {
  total_mb: number;
  used_mb: number;
  free_mb: number;
  percent: number;
}

export interface DiskHealth {
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent: number;
}

export interface UptimeHealth {
  uptime_seconds: number;
  uptime_readable: string;
}

export interface SystemHealthResponse {
  model: string;
  cpu_temp: number | null;
  cpu_temp_status: 'normal' | 'warm' | 'hot';
  cpu: CpuHealth;
  ram: RamHealth;
  disk: DiskHealth;
  uptime: UptimeHealth;
  ip_address: string;
  hostname: string;
}

