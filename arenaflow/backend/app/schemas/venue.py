from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List, Dict, Any

class ZoneBase(BaseModel):
    name: str
    zone_type: str
    capacity: int
    latitude: float
    longitude: float
    polygon_coords: Any

class ZoneCreate(ZoneBase):
    venue_id: UUID

class ZoneOut(ZoneBase):
    id: UUID
    venue_id: UUID
    is_active: bool
    
    model_config = ConfigDict(from_attributes=True)

class VenueBase(BaseModel):
    name: str
    city: str
    country: str
    total_capacity: int
    latitude: float
    longitude: float

class VenueCreate(VenueBase):
    google_place_id: Optional[str] = None
    config_json: Optional[Any] = None

class VenueOut(VenueBase):
    id: UUID
    google_place_id: Optional[str] = None
    config_json: Optional[Any] = None
    is_active: bool
    created_at: datetime
    zones: List[ZoneOut]
    
    model_config = ConfigDict(from_attributes=True)
