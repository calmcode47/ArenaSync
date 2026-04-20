from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.dependencies import get_db, limiter
from app.models.venue import Venue
from app.schemas.venue import VenueOut
from app.services.maps_service import MapsService

router = APIRouter()
maps_service = MapsService()

from datetime import datetime

DEMO_VENUE_DATA = {
    "id": "00000000-0000-0000-0000-000000000000",
    "name": "Madison Square Garden",
    "city": "New York",
    "country": "USA",
    "total_capacity": 19500,
    "address": "4 Pennsylvania Plaza, New York, NY 10001",
    "latitude": 40.7505,
    "longitude": -73.9934,
    "google_place_id": "ChIJMc_65NlYwokR9vT-V6Xo7iU",
    "is_active": True,
    "created_at": datetime.now(),
    "zones": [
        {
            "id": "11111111-1111-1111-1111-111111111111",
            "venue_id": "00000000-0000-0000-0000-000000000000",
            "name": "Main Entrance",
            "zone_type": "entrance",
            "capacity": 5000,
            "latitude": 40.7505,
            "longitude": -73.9934,
            "polygon_coords": [],
            "is_active": True,
        },
        {
            "id": "22222222-2222-2222-2222-222222222222",
            "venue_id": "00000000-0000-0000-0000-000000000000",
            "name": "East Concourse",
            "zone_type": "concourse",
            "capacity": 2000,
            "latitude": 40.7506,
            "longitude": -73.9935,
            "polygon_coords": [],
            "is_active": True,
        },
        {
            "id": "33333333-3333-3333-3333-333333333333",
            "venue_id": "00000000-0000-0000-0000-000000000000",
            "name": "Section 108",
            "zone_type": "seating",
            "capacity": 800,
            "latitude": 40.7507,
            "longitude": -73.9936,
            "polygon_coords": [],
            "is_active": True,
        },
    ],
}

DEMO_VENUES_LIST = [
    {
        "id": "00000000-0000-0000-0000-000000000000",
        "name": "Madison Square Garden",
        "city": "New York",
        "country": "USA",
        "total_capacity": 19500,
        "latitude": 40.7505,
        "longitude": -73.9934,
        "is_active": True,
    },
    {
        "id": "44444444-4444-4444-4444-444444444444",
        "name": "Crypto.com Arena",
        "city": "Los Angeles",
        "country": "USA",
        "total_capacity": 20000,
        "latitude": 34.0430,
        "longitude": -118.2673,
        "is_active": True,
    },
    {
        "id": "55555555-5555-5555-5555-555555555555",
        "name": "SoFi Stadium",
        "city": "Inglewood",
        "country": "USA",
        "total_capacity": 70240,
        "latitude": 33.9535,
        "longitude": -118.3390,
        "is_active": True,
    },
]


@router.get("/venues")
async def list_venues(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetch all available venues."""
    if settings.DEMO_MODE:
        return DEMO_VENUES_LIST

    try:
        result = await db.execute(select(Venue).where(Venue.is_active == True))
        venues = result.scalars().all()
        # Fallback to demo list if DB is empty to ensure a good UX
        if not venues:
            return DEMO_VENUES_LIST
        return venues
    except Exception as e:
        if settings.DEMO_MODE:
            return DEMO_VENUES_LIST
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/venue/{venue_id}", response_model=VenueOut)
async def get_venue(
    venue_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Any:
    if settings.DEMO_MODE:
        return DEMO_VENUE_DATA

    try:
        result = await db.execute(
            select(Venue).options(selectinload(Venue.zones)).where(Venue.id == venue_id)
        )
        venue = result.scalars().first()
        if not venue:
            if str(venue_id) == DEMO_VENUE_DATA["id"]:
                return DEMO_VENUE_DATA
            raise HTTPException(status_code=404, detail="Venue not found")
        return VenueOut.model_validate(venue)
    except Exception as e:
        if settings.DEMO_MODE or "connection" in str(e).lower():
            return DEMO_VENUE_DATA
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/venue/{venue_id}/details")
@limiter.limit("30/minute")
async def get_venue_details(
    request: Request,
    venue_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Get Google Maps place details for a venue's stored Place ID."""
    venue = await db.get(Venue, venue_id)
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")
    if not venue.google_place_id:
        raise HTTPException(
            status_code=409, detail="Venue has no stored Google Place ID"
        )
    return await maps_service.get_venue_details(venue.google_place_id)


@router.get("/directions")
@limiter.limit("20/minute")
async def get_directions(
    request: Request,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str = "walking",
) -> Any:
    """Get directions between origin and destination coordinates."""
    return await maps_service.get_directions(
        (origin_lat, origin_lng), (dest_lat, dest_lng), mode
    )


@router.get("/geocode")
@limiter.limit("20/minute")
async def geocode_address(request: Request, address: str) -> Any:
    """Convert a string address to lat/lng coordinates."""
    return await maps_service.geocode(address)


@router.get("/nearby-venues")
@limiter.limit("20/minute")
async def get_nearby_venues(
    request: Request,
    lat: float,
    lng: float,
    radius: int = Query(5000, description="Radius in meters"),
) -> Any:
    """Find nearby sporting venues within a given radius."""
    if not maps_service.gmaps:
        raise HTTPException(
            status_code=502, detail="Google Maps integration not configured"
        )
    try:
        import asyncio

        places = await asyncio.to_thread(
            maps_service.gmaps.places_nearby,
            location=(lat, lng),
            radius=radius,
            type="stadium",
        )
        return places.get("results", [])
    except Exception as e:
        import logging

        logging.error(f"Failed to find nearby venues: {e}")
        raise HTTPException(status_code=502, detail="Google Maps API error")
