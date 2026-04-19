import logging
import uuid
from datetime import datetime, timedelta

import aioredis
from arq import cron

from app.core.config import settings

logger = logging.getLogger(__name__)

async def dispatch_retrain_prophet(ctx) -> dict:
    # In a real scenario, fetch all active venue_ids from DB.
    # We will dispatch the actual task for a specific venue here.
    # Example placeholder:
    redis = ctx.get("redis")
    if redis:
        # Pushing a task to the queue
        await redis.enqueue_job("retrain_prophet_models", "default_venue_id")
    return {"status": "dispatched_prophet"}

async def dispatch_retrain_crowd(ctx) -> dict:
    redis = ctx.get("redis")
    if redis:
        await redis.enqueue_job("retrain_crowd_models", "default_venue_id")
    return {"status": "dispatched_crowd"}

from app.worker.tasks import auto_resolve_stale_alerts, send_ml_heartbeat

cron_jobs = [
    cron(dispatch_retrain_prophet, hour={0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22}, minute=0),
    cron(dispatch_retrain_crowd, hour={0, 4, 8, 12, 16, 20}, minute=30),
    cron(auto_resolve_stale_alerts, minute={0, 30}),
    cron(send_ml_heartbeat, second={0, 30}),
]
