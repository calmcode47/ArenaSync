import logging
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException

from app.models.queue_entry import QueueEntry
from app.models.zone import Zone
from app.schemas.queue import (
    QueueEntryCreate, QueueEntryOut, QueuePredictionOut, VenueQueueSummary
)
from app.core.redis_client import set_cached

logger = logging.getLogger(__name__)

class QueueService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_queue(self, data: QueueEntryCreate) -> QueueEntryOut:
        # Pseudo Prophet API integration
        estimated_wait_minutes = (data.queue_length / data.service_rate) if data.service_rate > 0 else 0.0
        
        entry = QueueEntry(
            zone_id=data.zone_id,
            venue_id=data.venue_id,
            queue_length=data.queue_length,
            estimated_wait_minutes=estimated_wait_minutes,
            service_rate=data.service_rate,
            actual_wait_minutes=None,
            recorded_at=datetime.now(timezone.utc)
        )
        
        self.db.add(entry)
        await self.db.commit()
        await self.db.refresh(entry)
        
        entry_out = QueueEntryOut.model_validate(entry)
        
        cache_key = f"queue:{str(data.zone_id)}:latest"
        await set_cached(cache_key, entry_out.model_dump(mode="json"), ttl_seconds=30)
        
        return entry_out

    async def get_zone_prediction(self, zone_id: UUID) -> QueuePredictionOut:
        zone = await self.db.get(Zone, zone_id)
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
            
        stmt = select(QueueEntry).where(QueueEntry.zone_id == zone_id).order_by(desc(QueueEntry.recorded_at)).limit(1)
        res = await self.db.execute(stmt)
        latest = res.scalar_one_or_none()
        
        q_len = latest.queue_length if latest else 0
        est_wait = latest.estimated_wait_minutes if latest else 0.0
        
        # Pseudo ML forecast for next 30 min (5 min intervals)
        forecast = [
            {"time": (datetime.now(timezone.utc) + timedelta(minutes=i)).isoformat(), "predicted_wait": max(0, est_wait - (i * 0.1))} 
            for i in range(5, 35, 5)
        ]
        
        return QueuePredictionOut(
            zone_id=zone_id,
            zone_name=zone.name,
            current_queue_length=q_len,
            estimated_wait_minutes=est_wait,
            prediction_confidence=0.85,
            next_30min_forecast=forecast
        )

    async def get_venue_queue_summary(self, venue_id: UUID) -> VenueQueueSummary:
        res = await self.db.execute(select(Zone).where(Zone.venue_id == venue_id))
        zones = res.scalars().all()
        
        predictions = []
        for zone in zones:
            if zone.zone_type in ["gate", "concession", "restroom"]:
                pred = await self.get_zone_prediction(zone.id)
                predictions.append(pred)
                
        if not predictions:
            return VenueQueueSummary(venue_id=venue_id, zones=[], worst_zone_id="", best_zone_id="")
            
        worst_zone = max(predictions, key=lambda p: p.estimated_wait_minutes)
        best_zone = min(predictions, key=lambda p: p.estimated_wait_minutes)
        
        return VenueQueueSummary(
            venue_id=venue_id,
            zones=predictions,
            worst_zone_id=str(worst_zone.zone_id),
            best_zone_id=str(best_zone.zone_id)
        )
