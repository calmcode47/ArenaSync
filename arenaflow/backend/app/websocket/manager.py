"""
WebSocket Connection Manager for real-time venue updates.
Manages room-based broadcasting: each venue_id is a "room".
Clients subscribe to a venue room on connect.
Server broadcasts crowd updates, queue changes, and alerts to the room.
"""

from fastapi import WebSocket
from collections import defaultdict
import asyncio
import orjson
import logging
from datetime import datetime, timezone

class ConnectionManager:
    def __init__(self):
        # rooms: dict[venue_id: str, set[WebSocket]]
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self.logger = logging.getLogger(__name__)

    async def connect(self, websocket: WebSocket, venue_id: str) -> None:
        await websocket.accept()
        self.rooms[venue_id].add(websocket)
        self.logger.info(f"Client connected to room {venue_id}. Total clients in room: {len(self.rooms[venue_id])}")
        
    async def disconnect(self, websocket: WebSocket, venue_id: str) -> None:
        if venue_id in self.rooms and websocket in self.rooms[venue_id]:
            self.rooms[venue_id].remove(websocket)
            self.logger.info(f"Client disconnected from room {venue_id}. Total clients: {len(self.rooms[venue_id])}")
            if len(self.rooms[venue_id]) == 0:
                del self.rooms[venue_id]

    async def broadcast_to_venue(self, venue_id: str, event_type: str, payload: dict) -> None:
        if venue_id not in self.rooms:
            return
            
        message = {
            "event": event_type, 
            "data": payload, 
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        message_str = orjson.dumps(message).decode("utf-8")
        
        dead_connections = set()
        for connection in self.rooms[venue_id]:
            try:
                await connection.send_text(message_str)
            except Exception as e:
                self.logger.warning(f"Error sending message to client: {e}")
                dead_connections.add(connection)
                
        for dead in dead_connections:
            await self.disconnect(dead, venue_id)

    async def send_personal(self, websocket: WebSocket, event_type: str, payload: dict) -> None:
        try:
            message = {
                "event": event_type, 
                "data": payload, 
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            await websocket.send_text(orjson.dumps(message).decode("utf-8"))
        except Exception as e:
            self.logger.warning(f"Error sending personal message: {e}")

manager = ConnectionManager()
