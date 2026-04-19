import uuid
from datetime import datetime
from typing import Any, List

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Zone(Base):
    __tablename__ = "zones"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    venue_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    zone_type: Mapped[str] = mapped_column(
        Enum(
            "gate",
            "concession",
            "restroom",
            "seating",
            "emergency_exit",
            "parking",
            name="zone_type_enum",
        ),
        nullable=False,
    )
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    polygon_coords: Mapped[Any] = mapped_column(JSONB, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    venue: Mapped["Venue"] = relationship("Venue", back_populates="zones")
    crowd_snapshots: Mapped[List["CrowdSnapshot"]] = relationship(
        "CrowdSnapshot", back_populates="zone", cascade="all, delete-orphan"
    )
    queue_entries: Mapped[List["QueueEntry"]] = relationship(
        "QueueEntry", back_populates="zone", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Zone {self.name} (Type: {self.zone_type})>"
