import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.firebase import send_fcm_notification
from app.core.redis_client import publish_event
from app.models.alert import Alert
from app.models.user import User
from app.schemas.alert import AlertBroadcast, AlertCreate, AlertOut
from app.services.translate_service import TranslateService

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

        # Pre-add to get ID if needed, but we can do it after flush
        self.db.add(alert)
        await self.db.flush()

        # Send FCM if severity is high or critical
        if data.severity in ("high", "critical"):
            staff_tokens = await self._get_staff_fcm_tokens(data.venue_id)
            if staff_tokens:
                sent_count = 0
                for token in staff_tokens:
                    success = await send_fcm_notification(
                        fcm_token=token,
                        title=f"[{data.severity.upper()}] {data.title}",
                        body=data.message[:100],
                        data={
                            "alert_id": str(alert.id),
                            "venue_id": str(data.venue_id),
                            "severity": data.severity,
                            "alert_type": data.alert_type,
                        }
                    )
                    if success:
                        sent_count += 1

                if sent_count > 0:
                    alert.fcm_sent = True
                    # No need to commit here, we commit at the end

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

        await publish_event(f"alerts:{str(data.venue_id)}", broadcast_data.model_dump(mode="json"), event_type="alert_created")
        return out

    async def delete_alert(self, alert_id: UUID) -> bool:
        alert = await self.db.get(Alert, alert_id)
        if not alert:
            return False

        venue_id = alert.venue_id
        await self.db.delete(alert)
        await self.db.commit()

        await publish_event(f"alerts:{str(venue_id)}", {"alert_id": str(alert_id)}, event_type="alert_deleted")
        return True

    async def _get_staff_fcm_tokens(self, venue_id: UUID) -> list[str]:
        """Fetch non-null FCM tokens for all active staff and admin users."""
        result = await self.db.execute(
            select(User.fcm_token)
            .where(User.role.in_(["staff", "admin"]))
            .where(User.fcm_token.isnot(None))
            .where(User.is_active == True)
        )
        return [row[0] for row in result.fetchall()]

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

    def _get_mock_alerts(self, venue_id: UUID) -> list[AlertOut]:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        return [
            AlertOut(
                id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                venue_id=venue_id,
                zone_id=UUID("33333333-3333-3333-3333-333333333333"),
                alert_type="overcrowding",
                severity="critical",
                title="Critical Congestion: Section 108",
                message="Section 108 has reached 92% capacity. Please redirect incoming attendees to neighboring sections.",
                translated_messages={},
                is_resolved=False,
                fcm_sent=True,
                created_at=now
            ),
            AlertOut(
                id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                venue_id=venue_id,
                zone_id=UUID("11111111-1111-1111-1111-111111111111"),
                alert_type="long_queue",
                severity="medium",
                title="Main Entrance Delay",
                message="Wait times at Main Entrance have exceeded 15 minutes. Heavy initial flow detected.",
                translated_messages={},
                is_resolved=False,
                fcm_sent=False,
                created_at=now
            )
        ]

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
