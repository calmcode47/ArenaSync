import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .zone import Zone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, Integer, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class CrowdSnapshot(Base):
    __tablename__ = "crowd_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    zone_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("zones.id", ondelete="CASCADE"), nullable=False
    )
    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )

    current_count: Mapped[int] = mapped_column(Integer, nullable=False)
    density_score: Mapped[float] = mapped_column(Float, nullable=False)
    congestion_level: Mapped[str] = mapped_column(
        Enum("low", "moderate", "high", "critical", name="congestion_level_enum"),
        nullable=False,
    )
    flow_direction: Mapped[Any] = mapped_column(JSONB, nullable=False)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    zone: Mapped["Zone"] = relationship("Zone", back_populates="crowd_snapshots")

    __table_args__ = (
        Index("ix_crowd_snapshots_zone_recorded", "zone_id", "recorded_at"),
        Index("ix_crowd_snapshots_venue_recorded", "venue_id", "recorded_at"),
    )

    def __repr__(self) -> str:
        return f"<CrowdSnapshot {self.id} (Zone {self.zone_id}: {self.current_count})>"
