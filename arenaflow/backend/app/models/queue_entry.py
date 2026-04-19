import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    zone_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False)
    venue_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False)

    queue_length: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_wait_minutes: Mapped[float] = mapped_column(Float, nullable=False)
    actual_wait_minutes: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    service_rate: Mapped[float] = mapped_column(Float, nullable=False)

    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    zone: Mapped["Zone"] = relationship("Zone", back_populates="queue_entries")

    __table_args__ = (
        Index("ix_queue_entries_zone_recorded", "zone_id", "recorded_at"),
    )

    def __repr__(self) -> str:
        return f"<QueueEntry {self.id} (Wait: {self.estimated_wait_minutes}m)>"
