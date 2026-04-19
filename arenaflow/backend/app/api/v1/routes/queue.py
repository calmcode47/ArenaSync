from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, limiter
from app.models.queue_entry import QueueEntry
from app.models.user import User
from app.schemas.queue import QueueEntryCreate, QueueEntryOut, QueuePredictionOut, VenueQueueSummary
from app.services.queue_service import QueueService

router = APIRouter()

def require_staff(user: User = Depends(get_current_user)):
    if user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user

@router.post("/record", response_model=QueueEntryOut, status_code=201)
async def record_queue_entry(
    entry_in: QueueEntryCreate,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Record a new queue entry. Requires staff privileges."""
    service = QueueService(db)
    return await service.record_queue(entry_in)

@router.get("/venue/{venue_id}/summary", response_model=VenueQueueSummary)
@limiter.limit("60/minute")
async def get_venue_queue_summary(
    request: Request,
    venue_id: UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get all zones queue status and predictions for a venue."""
    service = QueueService(db)
    return await service.get_venue_queue_summary(venue_id)

@router.get("/zone/{zone_id}/prediction", response_model=QueuePredictionOut)
@limiter.limit("30/minute")
async def get_zone_prediction(
    request: Request,
    zone_id: UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get Prophet forecast for a specific zone queue wait times."""
    service = QueueService(db)
    return await service.get_zone_prediction(zone_id)

@router.patch("/entry/{entry_id}/actual-wait", response_model=QueueEntryOut)
async def update_actual_wait(
    entry_id: UUID,
    actual_wait_minutes: float,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Update actual wait time for a previous entry to act as feedback loop for ML."""
    entry = await db.get(QueueEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    entry.actual_wait_minutes = actual_wait_minutes
    await db.commit()
    await db.refresh(entry)
    return entry
