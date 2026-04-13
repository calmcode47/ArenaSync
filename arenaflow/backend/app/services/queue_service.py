import logging
from uuid import UUID
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException
import pandas as pd

from app.models.queue_entry import QueueEntry
from app.models.zone import Zone
from app.schemas.queue import (
    QueueEntryCreate, QueueEntryOut, QueuePredictionOut, VenueQueueSummary
)
from app.core.redis_client import set_cached
from app.services.ml.prophet_engine import prophet_engine

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

    async def _get_zone(self, zone_id: UUID) -> Zone:
        return await self.db.get(Zone, zone_id)

    async def _get_latest_queue_entry(self, zone_id: UUID) -> QueueEntry:
        stmt = select(QueueEntry).where(QueueEntry.zone_id == zone_id).order_by(desc(QueueEntry.recorded_at)).limit(1)
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def _get_queue_history_df(self, zone_id: UUID, days: int = 7) -> pd.DataFrame:
        target_date = datetime.now(timezone.utc) - timedelta(days=days)
        stmt = select(QueueEntry).where(QueueEntry.zone_id == zone_id, QueueEntry.recorded_at > target_date).order_by(QueueEntry.recorded_at.asc())
        res = await self.db.execute(stmt)
        entries = res.scalars().all()
        data = [{"ds": e.recorded_at, "y": e.queue_length} for e in entries]
        df = pd.DataFrame(data)
        if len(df) > 0:
            df['ds'] = df['ds'].dt.tz_localize(None)
        return df

    async def get_zone_prediction(self, zone_id: UUID) -> QueuePredictionOut:
        zone = await self._get_zone(zone_id)
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
            
        latest_queue = await self._get_latest_queue_entry(zone_id)

        queue_length = latest_queue.queue_length if latest_queue else 0
        service_rate = latest_queue.service_rate if latest_queue else 10.0

        try:
            history = await self._get_queue_history_df(zone_id, days=7)
            if len(history) >= 10:
                if not prophet_engine._models.get(str(zone_id)):
                    prophet_engine.fit(str(zone_id), history)
                forecast = prophet_engine.predict(str(zone_id))
                estimated_wait = max(0.0, float(forecast["estimated_wait_minutes"]))
                confidence = float(forecast.get("confidence", 0.75))
                next_30min = forecast.get("forecast", [])
            else:
                raise ValueError(f"Insufficient history: {len(history)} points")

        except Exception as e:
            logger.warning(f"Prophet prediction failed for zone {zone_id}: {e}. Using Little's Law.")
            estimated_wait = prophet_engine.estimate_wait_from_queue(queue_length, service_rate)
            confidence = 0.5  # lower confidence for fallback
            # Generate synthetic 30-min forecast using Little's Law at declining queue lengths (simulates 5% drain per 5 mins)
            next_30min = [
                {
                    "ds": (datetime.now(timezone.utc) + timedelta(minutes=i*5)).isoformat(),
                    "yhat": max(0.0, estimated_wait - (i * estimated_wait * 0.05)),
                    "yhat_lower": max(0.0, estimated_wait * 0.7),
                    "yhat_upper": estimated_wait * 1.3
                }
                for i in range(1, 7)
            ]

        return QueuePredictionOut(
            zone_id=str(zone_id),
            zone_name=zone.name,
            current_queue_length=queue_length,
            estimated_wait_minutes=round(estimated_wait, 1),
            prediction_confidence=round(confidence, 2),
            next_30min_forecast=next_30min
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
