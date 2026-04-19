from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class QueueEntryCreate(BaseModel):
    zone_id: UUID
    venue_id: Optional[UUID] = None
    queue_length: int
    service_rate: float = 10.0

class QueueEntryOut(BaseModel):
    id: UUID
    zone_id: UUID
    venue_id: UUID
    queue_length: int
    estimated_wait_minutes: float
    actual_wait_minutes: Optional[float] = None
    service_rate: float
    recorded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class QueueForecastPoint(BaseModel):
    timestamp: datetime
    wait_time_minutes: float
    yhat_lower: float
    yhat_upper: float

class QueuePredictionOut(BaseModel):
    zone_id: UUID
    zone_name: str
    current_queue_length: int
    estimated_wait_minutes: float
    confidence_score: float
    congestion_level: str
    next_30min_forecast: List[QueueForecastPoint]

class VenueQueueSummary(BaseModel):
    venue_id: UUID
    total_global_queue_length: int
    average_wait_minutes: float
    zones: List[QueuePredictionOut]
    worst_zone_id: str
    best_zone_id: str
