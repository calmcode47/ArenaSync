from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AlertCreate(BaseModel):
    venue_id: UUID
    zone_id: Optional[UUID] = None
    alert_type: str
    severity: str
    title: str
    message: str


class AlertOut(BaseModel):
    id: UUID
    venue_id: UUID
    zone_id: Optional[UUID]
    alert_type: str
    severity: str
    title: str
    message: str
    translated_messages: Any
    is_resolved: bool
    fcm_sent: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertUpdate(BaseModel):
    is_resolved: bool


class AlertBroadcast(BaseModel):
    alert_id: UUID
    title: str
    message: str
    severity: str
    venue_id: UUID
    zone_id: Optional[UUID]
    timestamp: datetime
