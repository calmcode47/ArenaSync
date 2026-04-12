from fastapi import APIRouter, Depends, Request, Query, HTTPException
from typing import Any, List
from uuid import UUID

from app.core.dependencies import limiter
from app.services.maps_service import MapsService

router = APIRouter()
maps_service = MapsService()

@router.get("/venue/{venue_id}/details")
@limiter.limit("30/minute")
async def get_venue_details(
    request: Request,
    venue_id: UUID,
    place_id: str
) -> Any:
    """Get Google Maps place details for a venue's Place ID."""
    return await maps_service.get_venue_details(place_id)

@router.get("/directions")
@limiter.limit("20/minute")
async def get_directions(
    request: Request,
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
    mode: str = "walking"
) -> Any:
    """Get directions between origin and destination coordinates."""
    return await maps_service.get_directions((origin_lat, origin_lng), (dest_lat, dest_lng), mode)

@router.get("/geocode")
@limiter.limit("20/minute")
async def geocode_address(
    request: Request,
    address: str
) -> Any:
    """Convert a string address to lat/lng coordinates."""
    return await maps_service.geocode(address)

@router.get("/nearby-venues")
@limiter.limit("20/minute")
async def get_nearby_venues(
    request: Request,
    lat: float,
    lng: float,
    radius: int = Query(5000, description="Radius in meters")
) -> Any:
    """Find nearby sporting venues within a given radius."""
    if not maps_service.gmaps:
        raise HTTPException(status_code=502, detail="Google Maps integration not configured")
    try:
        import asyncio
        places = await asyncio.to_thread(
            maps_service.gmaps.places_nearby,
            location=(lat, lng),
            radius=radius,
            type='stadium'
        )
        return places.get('results', [])
    except Exception as e:
        import logging
        logging.error(f"Failed to find nearby venues: {e}")
        raise HTTPException(status_code=502, detail="Google Maps API error")
