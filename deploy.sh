#!/usr/bin/env bash
set -e

# ==============================================================================
# RPi YouTube Music Player - Deployment Script
# Build image on host PC (ARM64) and deploy directly to Raspberry Pi 4 via SSH.
# ==============================================================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

IMAGE_NAME="rpi-yt-music-player:latest"
TARGET_PLATFORM="${TARGET_PLATFORM:-linux/arm64}"
REMOTE_DIR="${REMOTE_DIR:-~/rpi-yt-music-player}"
TEMP_TAR="/tmp/rpi-yt-music-player.tar.gz"

# Default credentials if not overridden
PI_TARGET="${1:-myrpi2@192.168.1.111}"
PI_PASS="${PI_PASS:-nomoredota}"

echo -e "${BLUE}=====================================================${NC}"
echo -e "${GREEN}   Raspberry Pi 4 YouTube Music Player Deployer      ${NC}"
echo -e "${BLUE}=====================================================${NC}"
echo -e "Target: ${YELLOW}${PI_TARGET}${NC}\n"

# Helper function to run SSH commands
run_ssh() {
  if command -v sshpass >/dev/null 2>&1 && [ -n "$PI_PASS" ]; then
    sshpass -p "$PI_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$PI_TARGET" "$@"
  else
    ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$PI_TARGET" "$@"
  fi
}

# Helper function to copy files via SCP
run_scp() {
  if command -v sshpass >/dev/null 2>&1 && [ -n "$PI_PASS" ]; then
    sshpass -p "$PI_PASS" scp -o StrictHostKeyChecking=no "$@"
  else
    scp -o StrictHostKeyChecking=no "$@"
  fi
}

# 1. Test SSH Connection
echo -e "${BLUE}[1/5] Memeriksa koneksi SSH ke ${PI_TARGET}...${NC}"
if ! run_ssh "exit"; then
  echo -e "${RED}[ERROR] Gagal terhubung ke $PI_TARGET via SSH.${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Terhubung ke Raspberry Pi!${NC}"

# 2. Build Multi-arch Image on Host PC
echo -e "\n${BLUE}[2/5] Mem-build Docker image untuk platform [${TARGET_PLATFORM}] di komputer ini...${NC}"
echo "Proses kompilasi dilakukan di komputer host untuk menghemat resource dan waktu di RPi."

# Ensure buildx is ready
if ! docker buildx inspect default > /dev/null 2>&1; then
  docker buildx create --use --name rpi_builder 2>/dev/null || true
fi

docker buildx build \
  --platform "$TARGET_PLATFORM" \
  -t "$IMAGE_NAME" \
  --load \
  .

echo -e "${GREEN}✓ Build Docker image selesai!${NC}"

# 3. Export & Compress Image
echo -e "\n${BLUE}[3/5] Mengompres Docker image ke file tar...${NC}"
docker save "$IMAGE_NAME" | gzip > "$TEMP_TAR"
IMAGE_SIZE=$(du -h "$TEMP_TAR" | cut -f1)
echo -e "${GREEN}✓ Ukuran paket: ${IMAGE_SIZE}${NC}"

# 4. Transfer Files to Raspberry Pi
echo -e "\n${BLUE}[4/5] Mentransfer image dan docker-compose.yml ke Raspberry Pi...${NC}"
run_ssh "mkdir -p $REMOTE_DIR/data"
run_scp docker-compose.yml "$PI_TARGET:$REMOTE_DIR/docker-compose.yml"
run_scp "$TEMP_TAR" "$PI_TARGET:$REMOTE_DIR/rpi-image.tar.gz"
echo -e "${GREEN}✓ File berhasil ditransfer!${NC}"

# 5. Load and Run on Raspberry Pi
echo -e "\n${BLUE}[5/5] Memuat image dan menjalankan container di Raspberry Pi...${NC}"
run_ssh "bash -s" << 'EOF'
  set -e
  cd ~/rpi-yt-music-player
  echo "-> Loading Docker image..."
  docker load < rpi-image.tar.gz
  rm -f rpi-image.tar.gz

  echo "-> Memastikan service docker berjalan & user group audio..."
  echo nomoredota | sudo -S usermod -aG audio,docker $USER 2>/dev/null || true

  echo "-> Menjalankan container..."
  docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
  docker compose up -d || docker-compose up -d

  echo "-> Status container:"
  docker compose ps 2>/dev/null || docker-compose ps
EOF

# Clean up local tar
rm -f "$TEMP_TAR"

# Extract IP address for convenience URL
PI_IP=$(echo "$PI_TARGET" | cut -d'@' -f2)

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}   🎉 DEPLOY KE RASPBERRY PI BERHASIL!             ${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "Aplikasi sekarang berjalan di Raspberry Pi."
echo -e "Buka di browser: ${BLUE}http://${PI_IP}:8000${NC}"
echo -e "Audio output akan otomatis keluar dari jack 3.5mm Raspberry Pi.\n"
