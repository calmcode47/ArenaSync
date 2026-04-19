import secrets
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class VirtualQueueEntry(Base):
    __tablename__ = "virtual_queue_entries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    zone_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("zones.id", ondelete="CASCADE"), nullable=False
    )
    venue_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("venues.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        SQLEnum(
            "waiting",
            "called",
            "serving",
            "completed",
            "abandoned",
            name="vqueue_status_enum",
        ),
        default="waiting",
        nullable=False,
    )
    ticket_code: Mapped[str] = mapped_column(
        String(6), unique=True, index=True, nullable=False
    )
    estimated_call_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    called_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.utcnow(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.utcnow(),
        onupdate=lambda: datetime.utcnow(),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_vqueue_zone_status", "zone_id", "status"),
        Index("ix_vqueue_user_status", "user_id", "status"),
    )

    @staticmethod
    def generate_ticket_code() -> str:
        return secrets.token_urlsafe(4)[:6].upper()
