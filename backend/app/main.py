import os
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.services.mpv_player import player_service
from backend.app.websocket import ws_manager
from backend.app.routers import player, playlists, search

# Setup logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    logger.info("Initializing SQLite database...")
    init_db()

    logger.info("Starting MPV daemon...")
    player_service.start_mpv_daemon()

    # Start periodic player state broadcast task
    broadcast_task = asyncio.create_task(ws_manager.start_periodic_broadcast())

    logger.info("%s ready!", settings.APP_NAME)
    yield

    # --- Shutdown ---
    logger.info("Shutting down...")
    broadcast_task.cancel()
    player_service.shutdown()

app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for local network devices (HP, laptop, tablet)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(player.router)
app.include_router(playlists.router)
app.include_router(search.router)

# Healthcheck endpoint
@app.get("/api/health")
def healthcheck():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "mpv_simulated": player_service.simulated
    }

# Mount static frontend files if directory exists
if settings.STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(settings.STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index_file = settings.STATIC_DIR / "index.html"
        file_path = settings.STATIC_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(index_file)

