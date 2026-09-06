import os
import shutil
import socket
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)

router = APIRouter(tags=["system"])

def get_cpu_temp() -> Optional[float]:
    """Read CPU temperature in Celsius from Linux thermal zone."""
    try:
        thermal_path = "/sys/class/thermal/thermal_zone0/temp"
        if os.path.exists(thermal_path):
            with open(thermal_path, "r") as f:
                temp_raw = f.read().strip()
                return round(float(temp_raw) / 1000.0, 1)
    except Exception as e:
        logger.warning(f"Failed to read CPU temp: {e}")
    return None

def get_ram_info() -> Dict[str, Any]:
    """Read RAM usage from /proc/meminfo."""
    try:
        if os.path.exists("/proc/meminfo"):
            with open("/proc/meminfo", "r") as f:
                lines = f.readlines()
            mem: Dict[str, int] = {}
            for line in lines:
                parts = line.split(":")
                if len(parts) == 2:
                    key = parts[0].strip()
                    val = parts[1].strip().split()[0]
                    mem[key] = int(val)
            
            total_mb = mem.get("MemTotal", 0) // 1024
            avail_mb = mem.get("MemAvailable", mem.get("MemFree", 0)) // 1024
            used_mb = max(0, total_mb - avail_mb)
            percent = round((used_mb / total_mb * 100), 1) if total_mb > 0 else 0.0

            return {
                "total_mb": total_mb,
                "used_mb": used_mb,
                "free_mb": avail_mb,
                "percent": percent
            }
    except Exception as e:
        logger.warning(f"Failed to read /proc/meminfo: {e}")
    
    return {"total_mb": 0, "used_mb": 0, "free_mb": 0, "percent": 0.0}

def get_disk_info() -> Dict[str, Any]:
    """Read disk usage from /app/data or root."""
    path = "/app/data" if os.path.exists("/app/data") else "/"
    try:
        du = shutil.disk_usage(path)
        total_gb = round(du.total / (1024 ** 3), 1)
        used_gb = round(du.used / (1024 ** 3), 1)
        free_gb = round(du.free / (1024 ** 3), 1)
        percent = round((du.used / du.total * 100), 1) if du.total > 0 else 0.0
        return {
            "total_gb": total_gb,
            "used_gb": used_gb,
            "free_gb": free_gb,
            "percent": percent
        }
    except Exception as e:
        logger.warning(f"Failed to read disk usage: {e}")
        return {"total_gb": 0.0, "used_gb": 0.0, "free_gb": 0.0, "percent": 0.0}

def get_uptime_info() -> Dict[str, Any]:
    """Read system uptime from /proc/uptime."""
    try:
        if os.path.exists("/proc/uptime"):
            with open("/proc/uptime", "r") as f:
                uptime_sec = float(f.read().split()[0])
            
            days = int(uptime_sec // 86400)
            hours = int((uptime_sec % 86400) // 3600)
            mins = int((uptime_sec % 3600) // 60)
            
            parts = []
            if days > 0:
                parts.append(f"{days} hari")
            if hours > 0 or days > 0:
                parts.append(f"{hours} jam")
            parts.append(f"{mins} menit")
            
            readable = " ".join(parts)
            return {
                "uptime_seconds": int(uptime_sec),
                "uptime_readable": readable
            }
    except Exception as e:
        logger.warning(f"Failed to read /proc/uptime: {e}")
    return {"uptime_seconds": 0, "uptime_readable": "Tidak diketahui"}

def get_cpu_load() -> Dict[str, Any]:
    """Read CPU core count and load average."""
    cores = os.cpu_count() or 4
    try:
        load1, load5, load15 = os.getloadavg()
        load_percent = min(100.0, round((load1 / cores) * 100, 1))
        return {
            "cores": cores,
            "load_1m": round(load1, 2),
            "load_5m": round(load5, 2),
            "load_15m": round(load15, 2),
            "load_percent": load_percent
        }
    except Exception as e:
        logger.warning(f"Failed to get CPU load: {e}")
        return {
            "cores": cores,
            "load_1m": 0.0,
            "load_5m": 0.0,
            "load_15m": 0.0,
            "load_percent": 0.0
        }

def get_local_ip(request: Optional[Request] = None) -> str:
    """Determine local/LAN IPv4 address."""
    if request:
        host = request.headers.get("host", "")
        ip_part = host.split(":")[0]
        if ip_part and ip_part not in ("127.0.0.1", "localhost", "0.0.0.0"):
            return ip_part
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.2)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "192.168.1.111"

@router.get("/health")
def get_system_health(request: Request) -> Dict[str, Any]:
    """Return comprehensive Raspberry Pi 4 hardware health metrics."""
    temp = get_cpu_temp()
    
    temp_status = "normal"
    if temp is not None:
        if temp >= 75.0:
            temp_status = "hot"
        elif temp >= 60.0:
            temp_status = "warm"
        else:
            temp_status = "normal"

    return {
        "model": "Raspberry Pi 4 Model B",
        "cpu_temp": temp,
        "cpu_temp_status": temp_status,
        "cpu": get_cpu_load(),
        "ram": get_ram_info(),
        "disk": get_disk_info(),
        "uptime": get_uptime_info(),
        "ip_address": get_local_ip(request),
        "hostname": "Raspberry Pi 4"
    }
