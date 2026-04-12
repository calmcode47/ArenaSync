from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any

class CrowdSnapshotCreate(BaseModel):
    zone_id: UUID
    venue_id: UUID
    current_count: int
    flow_direction: Optional[Any] = None

class CrowdSnapshotOut(BaseModel):
    id: UUID
    zone_id: UUID
    venue_id: UUID
    current_count: int
    density_score: float
    congestion_level: str
    flow_direction: Any
    recorded_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ZoneCrowdStatus(BaseModel):
    zone_id: UUID
    zone_name: str
    zone_type: str
    density_score: float
    congestion_level: str
    current_count: int
    capacity: int

class VenueCrowdSummary(BaseModel):
    venue_id: UUID
    total_current_count: int
    total_capacity: int
    overall_occupancy_pct: float
    zones: List[ZoneCrowdStatus]

class CrowdHeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: float

class VenueHeatmapOut(BaseModel):
    venue_id: UUID
    points: List[CrowdHeatmapPoint]
    generated_at: datetime
