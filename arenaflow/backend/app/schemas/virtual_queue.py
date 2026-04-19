from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class JoinVirtualQueueRequest(BaseModel):
    zone_id: UUID
    venue_id: UUID


class VirtualQueueEntryOut(BaseModel):
    id: UUID
    zone_id: UUID
    venue_id: UUID
    position: int
    status: str
    ticket_code: str
    estimated_call_time: datetime
    created_at: datetime
    zone_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class VirtualQueueStatusOut(BaseModel):
    ticket_code: str
    position: int
    status: str
    estimated_call_time: datetime
    people_ahead: int
    estimated_wait_minutes: float


class CallNextRequest(BaseModel):
    zone_id: UUID


class CallNextOut(BaseModel):
    ticket_code: str
    user_id: UUID
    position: int
    zone_name: Optional[str] = None


class VirtualQueueSummaryOut(BaseModel):
    zone_id: UUID
    zone_name: Optional[str] = None
    total_waiting: int
    currently_serving: int
    avg_service_minutes: float
    next_call_ticket: Optional[str] = None
