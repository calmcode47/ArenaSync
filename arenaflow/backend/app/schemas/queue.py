from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any

class QueueEntryCreate(BaseModel):
    zone_id: UUID
    venue_id: UUID
    queue_length: int
    service_rate: float

class QueueEntryOut(BaseModel):
    id: UUID
    zone_id: UUID
    venue_id: UUID
    queue_length: int
    estimated_wait_minutes: float
    recorded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class QueuePredictionOut(BaseModel):
    zone_id: UUID
    zone_name: str
    current_queue_length: int
    estimated_wait_minutes: float
    prediction_confidence: float
    next_30min_forecast: List[Dict[str, Any]]

class VenueQueueSummary(BaseModel):
    venue_id: UUID
    zones: List[QueuePredictionOut]
    worst_zone_id: str
    best_zone_id: str
