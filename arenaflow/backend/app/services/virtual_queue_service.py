import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import and_, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.virtual_queue import VirtualQueueEntry
from app.models.zone import Zone
from app.schemas.virtual_queue import (
    CallNextOut,
    JoinVirtualQueueRequest,
    VirtualQueueEntryOut,
    VirtualQueueStatusOut,
    VirtualQueueSummaryOut,
)


class VirtualQueueService:
    async def join_queue(self, db: AsyncSession, user_id: uuid.UUID, data: JoinVirtualQueueRequest) -> VirtualQueueEntryOut:
        # Check active entry
        stmt = select(VirtualQueueEntry).where(
            VirtualQueueEntry.user_id == user_id,
            VirtualQueueEntry.zone_id == data.zone_id,
            VirtualQueueEntry.status.in_(["waiting", "called", "serving"])
        )
        res = await db.execute(stmt)
        if res.scalars().first():
            raise ValueError("User already has an active queue entry for this zone")

        # Get max position
        stmt_max = select(func.max(VirtualQueueEntry.position)).where(
            VirtualQueueEntry.zone_id == data.zone_id,
            VirtualQueueEntry.status.in_(["waiting", "called", "serving"])
        )
        res_max = await db.execute(stmt_max)
        max_pos = res_max.scalar() or 0
        new_pos = max_pos + 1

        # Estimate logic
        # Fallback to simple average service rate 3 mins per person ahead
        est_minutes = new_pos * 3
        est_time = datetime.utcnow() + timedelta(minutes=est_minutes)

        ticket = VirtualQueueEntry.generate_ticket_code()

        entry = VirtualQueueEntry(
            zone_id=data.zone_id,
            venue_id=data.venue_id,
            user_id=user_id,
            position=new_pos,
            ticket_code=ticket,
            estimated_call_time=est_time
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)

        # Zone name fallback
        z_stmt = select(Zone).where(Zone.id == data.zone_id)
        z_res = await db.execute(z_stmt)
        zone = z_res.scalars().first()

        return VirtualQueueEntryOut(
            id=entry.id,
            zone_id=entry.zone_id,
            venue_id=entry.venue_id,
            position=entry.position,
            status=entry.status,
            ticket_code=entry.ticket_code,
            estimated_call_time=entry.estimated_call_time,
            created_at=entry.created_at,
            zone_name=zone.name if zone else None
        )

    async def get_queue_status(self, db: AsyncSession, ticket_code: str) -> VirtualQueueStatusOut:
        stmt = select(VirtualQueueEntry).where(VirtualQueueEntry.ticket_code == ticket_code)
        res = await db.execute(stmt)
        entry = res.scalars().first()
        if not entry:
            raise ValueError("Ticket code not found")

        count_stmt = select(func.count()).where(
            VirtualQueueEntry.zone_id == entry.zone_id,
            VirtualQueueEntry.position < entry.position,
            VirtualQueueEntry.status.in_(["waiting", "called"])
        )
        count_res = await db.execute(count_stmt)
        people_ahead = count_res.scalar() or 0

        est_wait = people_ahead * 3.0

        return VirtualQueueStatusOut(
            ticket_code=entry.ticket_code,
            position=entry.position,
            status=entry.status,
            estimated_call_time=entry.estimated_call_time,
            people_ahead=people_ahead,
            estimated_wait_minutes=est_wait
        )

    async def call_next(self, db: AsyncSession, zone_id: uuid.UUID) -> CallNextOut:
        stmt = select(VirtualQueueEntry).where(
            VirtualQueueEntry.zone_id == zone_id,
            VirtualQueueEntry.status == "waiting"
        ).order_by(VirtualQueueEntry.position.asc()).limit(1)
        res = await db.execute(stmt)
        next_entry = res.scalars().first()

        if not next_entry:
            raise ValueError("No waiting entries in this zone")

        next_entry.status = "called"
        next_entry.called_at = datetime.utcnow()
        await db.commit()
        await db.refresh(next_entry)

        z_stmt = select(Zone).where(Zone.id == zone_id)
        z_res = await db.execute(z_stmt)
        zone = z_res.scalars().first()

        return CallNextOut(
            ticket_code=next_entry.ticket_code,
            user_id=next_entry.user_id,
            position=next_entry.position,
            zone_name=zone.name if zone else None
        )

    async def complete_entry(self, db: AsyncSession, ticket_code: str) -> VirtualQueueEntryOut:
        stmt = select(VirtualQueueEntry).where(VirtualQueueEntry.ticket_code == ticket_code)
        res = await db.execute(stmt)
        entry = res.scalars().first()
        if not entry:
            raise ValueError("Ticket code not found")

        entry.status = "completed"
        entry.completed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(entry)

        return VirtualQueueEntryOut(
            id=entry.id,
            zone_id=entry.zone_id,
            venue_id=entry.venue_id,
            position=entry.position,
            status=entry.status,
            ticket_code=entry.ticket_code,
            estimated_call_time=entry.estimated_call_time,
            created_at=entry.created_at,
            zone_name=None
        )

    async def abandon_entry(self, db: AsyncSession, ticket_code: str) -> None:
        stmt = select(VirtualQueueEntry).where(VirtualQueueEntry.ticket_code == ticket_code)
        res = await db.execute(stmt)
        entry = res.scalars().first()
        if not entry or entry.status in ["completed", "abandoned"]:
            return

        entry.status = "abandoned"
        # Decrement positions of waiting people behind
        update_stmt = update(VirtualQueueEntry).where(
            VirtualQueueEntry.zone_id == entry.zone_id,
            VirtualQueueEntry.position > entry.position,
            VirtualQueueEntry.status == "waiting"
        ).values(position=VirtualQueueEntry.position - 1)

        await db.execute(update_stmt)
        await db.commit()

    async def get_zone_summary(self, db: AsyncSession, zone_id: uuid.UUID) -> VirtualQueueSummaryOut:
        z_stmt = select(Zone).where(Zone.id == zone_id)
        z_res = await db.execute(z_stmt)
        zone = z_res.scalars().first()

        if not zone:
            raise ValueError("Zone not found")

        # Waiting count
        w_stmt = select(func.count()).where(VirtualQueueEntry.zone_id == zone_id, VirtualQueueEntry.status == "waiting")
        w_res = await db.execute(w_stmt)
        total_waiting = w_res.scalar() or 0

        # Serving count
        s_stmt = select(func.count()).where(VirtualQueueEntry.zone_id == zone_id, VirtualQueueEntry.status.in_(["called", "serving"]))
        s_res = await db.execute(s_stmt)
        currently_serving = s_res.scalar() or 0

        # Next ticket
        n_stmt = select(VirtualQueueEntry.ticket_code).where(
            VirtualQueueEntry.zone_id == zone_id, VirtualQueueEntry.status == "waiting"
        ).order_by(VirtualQueueEntry.position.asc()).limit(1)
        n_res = await db.execute(n_stmt)
        next_ticket = n_res.scalar()

        return VirtualQueueSummaryOut(
            zone_id=zone_id,
            zone_name=zone.name,
            total_waiting=total_waiting,
            currently_serving=currently_serving,
            avg_service_minutes=3.0,
            next_call_ticket=next_ticket
        )
