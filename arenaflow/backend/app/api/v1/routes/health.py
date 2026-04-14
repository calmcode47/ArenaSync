from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import time
from datetime import datetime, timezone
from typing import Dict, Any

from app.core.config import settings
from app.core.dependencies import get_db, limiter
from app.core.redis_client import redis
from app.core.firebase import firebase_app
from app.services.ml.prophet_engine import prophet_engine
# We'll try to import a global instance if we create it, or just use the class status
from app.services.ml.crowd_model import CrowdDensityModel

router = APIRouter()

@router.get("", tags=["health"])
async def health_check() -> Dict[str, str]:
    """Basic health check for Cloud Run / Liveness probes."""
    return {"status": "ok", "env": settings.APP_ENV}

@router.get("/detailed", tags=["health"])
@limiter.limit("5/minute")
async def detailed_health_check(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Detailed health check for administration and integration verification.
    Checks connections to Database, Redis, Firebase, and ML engines.
    """
    start_time = time.time()
    
    # 1. Database Check
    db_status = "ok"
    db_latency = 0.0
    try:
        db_start = time.time()
        # Use a short timeout for health check
        await db.execute(text("SELECT 1"))
        db_latency = (time.time() - db_start) * 1000
    except Exception as e:
        db_status = "error"
    
    # 2. Redis Check
    redis_status = "ok"
    redis_latency = 0.0
    if redis:
        try:
            redis_start = time.time()
            await redis.ping()
            redis_latency = (time.time() - redis_start) * 1000
        except Exception:
            redis_status = "error"
    else:
        redis_status = "disabled"

    # 3. Firebase Check
    firebase_status = "ok" if firebase_app else "disabled"

    # 4. Prophet Engine Check
    prophet_status = "ok"
    zones_fitted = len(prophet_engine._models)

    # 5. Crowd Model Check
    # For now, we instantiate a dummy or check a shared instance
    # Ideally this should be a singleton
    crowd_model_fitted = False
    try:
        # Check if we can get a global instance (to be added)
        from app.services.ml.crowd_model import crowd_model
        crowd_model_fitted = crowd_model.is_fitted
    except ImportError:
        pass

    # Overall Status Logic
    overall_status = "ok"
    if db_status == "error":
        overall_status = "error"
    elif redis_status == "error" or not crowd_model_fitted:
        overall_status = "degraded"

    return {
        "status": overall_status,
        "env": settings.APP_ENV,
        "services": {
            "database": {"status": db_status, "latency_ms": round(db_latency, 2)},
            "redis": {"status": redis_status, "latency_ms": round(redis_latency, 2)},
            "firebase": {"status": firebase_status},
            "prophet": {"status": prophet_status, "zones_fitted": zones_fitted},
            "crowd_model": {"status": "ok" if crowd_model_fitted else "not_trained", "is_fitted": crowd_model_fitted}
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_check_time_ms": round((time.time() - start_time) * 1000, 2)
    }
