import logging
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException

from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertOut, AlertBroadcast
from app.services.translate_service import TranslateService
from app.core.redis_client import publish_event

logger = logging.getLogger(__name__)

class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.translate_service = TranslateService()

    async def create_alert(self, data: AlertCreate, created_by: UUID | None) -> AlertOut:
        try:
            translated_dict = await self.translate_service.translate_alert(data.title, data.message)
        except Exception as e:
            logger.warning(f"Translation failed: {e}")
            translated_dict = {}

        alert = Alert(
            venue_id=data.venue_id,
            zone_id=data.zone_id,
            created_by=created_by,
            alert_type=data.alert_type,
            severity=data.severity,
            title=data.title,
            message=data.message,
            translated_messages=translated_dict,
            is_resolved=False,
            fcm_sent=False,
            created_at=datetime.now(timezone.utc)
        )

        if data.severity in ["high", "critical"]:
            try:
                # We simulate sending FCM notification to topic or user
                alert.fcm_sent = True
            except Exception as e:
                logger.error(f"FCM notification failed: {e}")

        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)

        out = AlertOut.model_validate(alert)
        broadcast_data = AlertBroadcast(
            alert_id=out.id,
            title=out.title,
            message=out.message,
            severity=out.severity,
            venue_id=out.venue_id,
            zone_id=out.zone_id,
            timestamp=out.created_at
        )
        
        await publish_event(f"alerts:{str(data.venue_id)}", broadcast_data.model_dump(mode="json"))
        return out

    async def resolve_alert(self, alert_id: UUID) -> AlertOut:
        alert = await self.db.get(Alert, alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
            
        alert.is_resolved = True
        alert.resolved_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        await self.db.refresh(alert)
        return AlertOut.model_validate(alert)

    async def get_active_alerts(self, venue_id: UUID) -> list[AlertOut]:
        stmt = select(Alert).where(
            Alert.venue_id == venue_id,
            Alert.is_resolved == False
        ).order_by(
            desc(Alert.severity),
            desc(Alert.created_at)
        )
        
        res = await self.db.execute(stmt)
        alerts = res.scalars().all()
        return [AlertOut.model_validate(a) for a in alerts]

    async def auto_alert_from_crowd(self, zone_id: UUID, venue_id: UUID, congestion_level: str) -> None:
        if congestion_level not in ["high", "critical"]:
            return
            
        stmt = select(Alert).where(
            Alert.zone_id == zone_id,
            Alert.alert_type == "overcrowding",
            Alert.is_resolved == False
        )
        res = await self.db.execute(stmt)
        if res.scalars().first() is not None:
            return
            
        alert_data = AlertCreate(
            venue_id=venue_id,
            zone_id=zone_id,
            alert_type="overcrowding",
            severity=congestion_level,
            title=f"Overcrowding Warning ({congestion_level.upper()})",
            message="High crowd density detected in this zone. Please dispatch staff or direct attendees elsewhere."
        )
        await self.create_alert(alert_data, created_by=None)
