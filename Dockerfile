# ==========================================
# Stage 1: Build Frontend (Static SPA)
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /build
COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Final Runtime Image (RPi & Linux)
# ==========================================
FROM python:3.11-slim-bookworm

# Install system dependencies: mpv, alsa-utils (amixer), yt-dlp, and audio libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    mpv \
    alsa-utils \
    libasound2 \
    libasound2-dev \
    curl \
    ca-certificates \
    ffmpeg \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install latest yt-dlp binary for best compatibility with YouTube updates
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && echo "--extractor-args youtube:player_client=android,web" > /etc/yt-dlp.conf

WORKDIR /app

# Install Python requirements
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend ./backend

# Copy compiled frontend static files
COPY --from=frontend-builder /build/dist ./frontend/dist

# Persistent data directory for SQLite
RUN mkdir -p /app/data

# Environment configuration
ENV PYTHONPATH=/app \
    DATA_DIR=/app/data \
    DATABASE_URL=sqlite:////app/data/music.db \
    STATIC_DIR=/app/frontend/dist \
    ALSA_CARD=0 \
    ALSA_CONTROL=Headphone \
    MPV_SOCKET_PATH=/tmp/mpv-socket

EXPOSE 8000

# Run FastAPI server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

