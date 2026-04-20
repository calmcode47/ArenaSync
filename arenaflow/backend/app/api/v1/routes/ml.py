from typing import Any, Dict

from fastapi import APIRouter, Body, Depends, HTTPException

from app.db.session import AsyncSessionLocal
from app.services.crowd_service import CrowdService
from app.services.ml.gemini_service import gemini_service
from app.services.ml.prophet_engine import prophet_engine

router = APIRouter()


@router.post("/warmup")
async def warmup_ml(payload: dict = Body(...)) -> Dict[str, Any]:
    venue_id = payload.get("venue_id")
    if not venue_id:
        raise HTTPException(status_code=400, detail="venue_id required")

    async with AsyncSessionLocal() as db:
        result = await prophet_engine.warmup_all_zones(db, venue_id)
        return {"status": "ok", "prophet": result}


@router.get("/insights/{venue_id}")
async def get_insights(venue_id: str) -> Dict[str, Any]:
    """Get AI-driven strategic insights for a venue."""
    async with AsyncSessionLocal() as db:
        # 1. Get live summary
        service = CrowdService(db)
        summary = await service.get_venue_summary(venue_id)
        if not summary:
            raise HTTPException(status_code=404, detail="Venue data not available")

        # 2. Get Gemini insights
        insights = await gemini_service.get_crowd_insights(
            summary.model_dump(mode="json")
        )
        return insights
