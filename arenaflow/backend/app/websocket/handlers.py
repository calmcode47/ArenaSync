import asyncio
import logging
from uuid import UUID

import orjson
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.dependencies import get_current_user, get_db
from app.core.security import decode_access_token
from app.services.alert_service import AlertService
from app.services.crowd_service import CrowdService
from app.websocket.manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)

ALLOWED_WS_ORIGINS = [origin.strip() for origin in settings.ALLOWED_ORIGINS]


@router.websocket("/{venue_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    venue_id: str,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Validate origin header
    origin = websocket.headers.get("origin", "")
    if origin and origin not in ALLOWED_WS_ORIGINS and settings.APP_ENV == "production":
        await websocket.close(code=4003)
        logger.warning(f"WebSocket rejected from unauthorized origin: {origin}")
        return

    # Validate JWT token
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001)
        return
    try:
        await get_current_user(token=token, db=db)
    except Exception:
        await websocket.close(code=4001)
        return

    # 2. Subscribe
    await manager.connect(websocket, venue_id)

    try:
        venue_uuid = UUID(venue_id)
    except ValueError:
        await manager.disconnect(websocket, venue_id)
        await websocket.close(code=1003, reason="Invalid venue ID")
        return

    # 3. Send initial state immediately
    try:
        crowd_service = CrowdService(db)
        alert_service = AlertService(db)

        crowd_summary = await crowd_service.get_venue_summary(venue_uuid)
        active_alerts = await alert_service.get_active_alerts(venue_uuid)

        await manager.send_personal(
            websocket,
            "initial_state",
            {
                "crowd": crowd_summary.model_dump(mode="json"),
                "alerts": [a.model_dump(mode="json") for a in active_alerts],
            },
        )
    except Exception as e:
        logger.error(f"Error fetching initial state: {e}")

    # Initialize heartbeat ping tracker
    loop = asyncio.get_event_loop()
    last_pong_time = loop.time()

    # 4. Heartbeat: every 30 seconds send ping
    async def heartbeat():
        nonlocal last_pong_time
        try:
            while True:
                await asyncio.sleep(30.0)
                # Check if we haven't received a pong in 65s
                if loop.time() - last_pong_time > 65.0:
                    logger.warning("WebSocket Heartbeat timeout")
                    await websocket.close(code=1008, reason="Heartbeat timeout")
                    break
                await manager.send_personal(websocket, "ping", {})
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    heartbeat_task = asyncio.create_task(heartbeat())

    # 5. Handle incoming messages
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = orjson.loads(data)
                event_type = payload.get("event")

                if event_type == "pong":
                    last_pong_time = loop.time()
                elif event_type == "crowd_update":
                    # staff update handler
                    await manager.broadcast_to_venue(
                        venue_id, "crowd_update", payload.get("data", {})
                    )

            except orjson.JSONDecodeError:
                logger.warning("Received invalid JSON on websocket")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected from {venue_id}")
    finally:
        heartbeat_task.cancel()
        await manager.disconnect(websocket, venue_id)
