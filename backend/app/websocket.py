import asyncio
import json
import logging
from typing import Set
from fastapi import WebSocket, WebSocketDisconnect
from backend.app.services.mpv_player import player_service

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages active WebSocket connections for player state broadcasting."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._broadcast_task: asyncio.Task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.debug("WebSocket client connected. Total clients: %d", len(self.active_connections))
        # Send initial state immediately
        await websocket.send_text(player_service.get_state().model_dump_json())

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.debug("WebSocket client disconnected. Total clients: %d", len(self.active_connections))

    async def broadcast_state(self):
        """Broadcast current player state to all connected clients."""
        if not self.active_connections:
            return

        state_json = player_service.get_state().model_dump_json()
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_text(state_json)
            except Exception:
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)

    async def start_periodic_broadcast(self):
        """Periodically query MPV status and broadcast to clients."""
        while True:
            try:
                player_service.update_status_from_mpv()
                if self.active_connections:
                    await self.broadcast_state()
            except Exception as e:
                logger.error("Error in player state broadcast loop: %s", e)
            await asyncio.sleep(1.0)

ws_manager = ConnectionManager()

