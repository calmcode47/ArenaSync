from typing import Any, Dict

from fastapi import APIRouter, Body, Depends, HTTPException

from app.db.session import AsyncSessionLocal
from app.services.ml.prophet_engine import prophet_engine

router = APIRouter()

@router.post("/warmup")
async def warmup_ml(payload: dict = Body(...)) -> Dict[str, Any]:
    venue_id = payload.get("venue_id")
    if not venue_id:
        raise HTTPException(status_code=400, detail="venue_id required")

    async with AsyncSessionLocal() as db:
        result = await prophet_engine.warmup_all_zones(db, venue_id)
        return {
            "status": "ok",
            "prophet": result
        }
