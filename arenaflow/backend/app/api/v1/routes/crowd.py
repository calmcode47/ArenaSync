from typing import Any, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, limiter
from app.models.user import User
from app.schemas.crowd import (
    CrowdSnapshotCreate,
    CrowdSnapshotOut,
    VenueCrowdSummary,
    VenueHeatmapOut,
)
from app.services.crowd_service import CrowdService
from app.services.ml.crowd_model import CrowdDensityModel

router = APIRouter()

def require_staff(user: User = Depends(get_current_user)):
    if user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user

@router.post("/snapshot", response_model=CrowdSnapshotOut, status_code=status.HTTP_201_CREATED)
async def record_crowd_snapshot(
    snapshot_in: CrowdSnapshotCreate,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Record a new crowd snapshot. Requires staff privileges."""
    service = CrowdService(db)
    return await service.record_snapshot(snapshot_in)

@router.get("/venue/{venue_id}/summary", response_model=VenueCrowdSummary)
@limiter.limit("60/minute")
async def get_venue_summary(
    request: Request,
    venue_id: UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get live crowd summary for a venue (cached)."""
    service = CrowdService(db)
    return await service.get_venue_summary(venue_id)

@router.get("/venue/{venue_id}/heatmap", response_model=VenueHeatmapOut)
@limiter.limit("60/minute")
async def get_venue_heatmap(
    request: Request,
    venue_id: UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get heatmap data for Google Maps overlay."""
    service = CrowdService(db)
    return await service.get_heatmap(venue_id)

@router.get("/zone/{zone_id}/history", response_model=List[CrowdSnapshotOut])
async def get_zone_history(
    zone_id: UUID,
    hours: int = 24,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get time-series snapshots for a zone."""
    service = CrowdService(db)
    return await service.get_historical(zone_id, hours=hours)

@router.get("/zone/{zone_id}/predict")
@limiter.limit("20/minute")
async def predict_zone_congestion(
    request: Request,
    zone_id: UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get ML congestion prediction for the next hour."""
    service = CrowdService(db)
    snapshots = await service.get_historical(zone_id, hours=1)
    if not snapshots:
        raise HTTPException(status_code=404, detail="Insufficient historical data for prediction")

    latest = snapshots[-1]

    current_features = {
        "hour_of_day": latest.recorded_at.hour,
        "day_of_week": latest.recorded_at.weekday(),
        "current_count": latest.current_count,
        "capacity": 1000,
        "prev_density_score": latest.density_score
    }

    from app.services.ml.crowd_model import crowd_model
    if not crowd_model.is_fitted:
        # In a real deployed app, model is loaded at startup
        return {"status": "Model not yet trained. Prediction unavailable."}

    try:
        return crowd_model.predict_next_hour(str(zone_id), current_features)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
