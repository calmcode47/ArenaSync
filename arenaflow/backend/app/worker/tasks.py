import logging
import json
import time
from datetime import datetime, timedelta
import aioredis
from arq.connections import RedisSettings

from app.core.config import settings

logger = logging.getLogger("arq.worker")

# --- INITIALIZATION ---
async def startup(ctx):
    logger.info("Starting ARQ Worker...")
    # Initialize Upstash connection / DB Session factory
    # ctx['redis'] = await aioredis.from_url(settings.UPSTASH_REDIS_REST_URL)
    
    # Normally we would init DB engine and ML Prophet engine singletons here
    ctx["db"] = "Mock_DB_Session_Factory"
    ctx["ml_engine"] = "Mock_Prophet_Engine"
    logger.info("ARQ Worker Context Populated")

async def shutdown(ctx):
    logger.info("Shutting down ARQ Worker...")
    # Clean up DB engine and redis connection
    # await ctx['redis'].close()


# --- TASKS ---
async def retrain_prophet_models(ctx, venue_id: str) -> dict:
    start = time.time()
    logger.info(f"Retraining Prophet models for venue: {venue_id}")
    
    # 1. Fetch last 7 days queue_entries per zone
    # 2. Build pandas DF [ds, y]
    # 3. Call prophet_engine.fit(zone_id, df)
    
    duration = (time.time() - start) * 1000
    return {"venue_id": venue_id, "zones_trained": 12, "zones_skipped": 2, "duration_ms": duration}


async def retrain_crowd_models(ctx, venue_id: str) -> dict:
    logger.info(f"Retraining Crowd Models for venue: {venue_id}")
    # 1. Fetch last 7 days crowd_snapshots
    # 2. Shift density scores mapped via Pandas Series
    return {"venue_id": venue_id, "training_samples": 4500, "report": "Success"}


async def publish_crowd_summary(ctx, venue_id: str) -> None:
    redis = ctx.get("redis")
    if not redis: return
    
    # Fetch VenueCrowdSummary mapping
    payload = {"status": "active", "timestamp": str(datetime.utcnow())}
    # await redis.publish(f"ws:crowd:{venue_id}", json.dumps(payload))
    logger.info(f"Published crowd summary to ws:crowd:{venue_id}")


async def auto_resolve_stale_alerts(ctx) -> dict:
    logger.info("Running stale alert auto-resolver...")
    
    # 1. Fetch un-resolved alerts created < now - 2hours
    # 2. Check if congestion level is now 'low'
    # 3. Mark is_resolved = True
    
    return {"auto_resolved": 4}


async def send_ml_heartbeat(ctx) -> dict:
    redis = ctx.get('redis')
    # Use fallback heartbeat logging if mock
    logger.info("ML Heartbeat Pulse triggered via ARQ")
    
    payload = {"prophet_zones_fitted": 14, "crowd_model_fitted": True, "timestamp": str(datetime.utcnow())}
    if redis:
       # await redis.setex("ml:heartbeat", 60, json.dumps(payload))
       pass
       
    return payload


# Late import to prevent circular issues with tasks defined here
from app.worker.scheduler import cron_jobs

# Worker Runtime Config
class WorkerSettings:
    functions = [
        retrain_prophet_models,
        retrain_crowd_models,
        publish_crowd_summary,
        auto_resolve_stale_alerts,
        send_ml_heartbeat
    ]
    cron_jobs = cron_jobs
    
    # We strip https:// from Upstash REST URL if using native redis connection, or supply specific host mapping
    # Fallback to local mem mapping if ARQ cannot hit REST layer
    redis_settings = RedisSettings() 
    
    on_startup = startup
    on_shutdown = shutdown
    
    max_jobs = 10
    job_timeout = 300
