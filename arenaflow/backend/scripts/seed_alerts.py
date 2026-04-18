import asyncio
import uuid
from datetime import datetime, timezone
from app.db import base
from app.db.session import AsyncSessionLocal
from app.models.alert import Alert

async def seed_alerts(venue_id: str):
    async with AsyncSessionLocal() as session:
        venue_uuid = uuid.UUID(venue_id)
        
        # Add a few variety alerts
        alerts = [
            Alert(
                id=uuid.uuid4(),
                venue_id=venue_uuid,
                alert_type='overcrowding',
                severity='high',
                title='High Density in North Stand',
                message='Crowd density has reached 85% in the North Stand entry. Please divert incoming flow to Gate 4.',
                translated_messages={},
                is_resolved=False,
                created_at=datetime.now(timezone.utc)
            ),
            Alert(
                id=uuid.uuid4(),
                venue_id=venue_uuid,
                alert_type='weather',
                severity='medium',
                title='Heavy Rain Expected',
                message='Satellite data indicates heavy rain starting in 15 minutes. Prepare indoor concourse staffing.',
                translated_messages={},
                is_resolved=False,
                created_at=datetime.now(timezone.utc)
            ),
            Alert(
                id=uuid.uuid4(),
                venue_id=venue_uuid,
                alert_type='info',
                severity='low',
                title='Shuttle Service Update',
                message='Shuttle B is now operating at 5-minute intervals between the station and North Gate.',
                translated_messages={},
                is_resolved=False,
                created_at=datetime.now(timezone.utc)
            )
        ]
        
        session.add_all(alerts)
        await session.commit()
        print(f"Seeded {len(alerts)} alerts for venue {venue_id}")

if __name__ == "__main__":
    asyncio.run(seed_alerts('77fc4bb0-0717-43e4-843b-0714703139ff'))
