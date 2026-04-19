import asyncio
import logging

import httpx
from fastapi import HTTPException
from geopy.exc import GeopyError
from geopy.geocoders import Nominatim

from app.core.config import settings

logger = logging.getLogger(__name__)


class MapsService:
    def __init__(self):
        # Nominatim requires a user_agent
        self.geolocator = Nominatim(user_agent="arenaflow_agent")
        # OSRM is a free routing service
        self.osrm_base_url = "http://router.project-osrm.org/route/v1"

    async def get_venue_details(self, place_id: str) -> dict:
        """
        In OSM mode, we don't have place_id details from Google.
        We fallback to generic info or use the place_id if it's an OSM ID.
        For now, returns a helpful message and placeholder.
        """
        # This endpoint is primarily for Google Place ID metadata.
        # We can implement a placeholder or use OSM Overpass API if needed.
        return {
            "name": "Arena Venue",
            "formatted_address": "Geolocation active via OpenStreetMap",
            "geometry": {"location": {"lat": 0, "lng": 0}},
        }

    async def get_directions(
        self,
        origin: tuple[float, float],
        destination: tuple[float, float],
        mode: str = "walking",
    ) -> dict:
        """
        Fetch walking directions using OSRM (Open Source Routing Machine).
        """
        try:
            # mode mapping for OSRM
            osrm_mode = "foot" if mode == "walking" else "car"

            # OSRM format: lng,lat;lng,lat
            coords = f"{origin[1]},{origin[0]};{destination[1]},{destination[0]}"
            url = f"{self.osrm_base_url}/{osrm_mode}/{coords}?overview=full&steps=true"

            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                if response.status_code != 200:
                    raise Exception(f"OSRM error: {response.text}")

                data = response.json()
                if not data.get("routes"):
                    return {}

                route = data["routes"][0]
                leg = route["legs"][0]

                return {
                    "distance": f"{leg['distance'] / 1000:.1f} km",
                    "duration": f"{leg['duration'] / 60:.0f} mins",
                    "steps": [step["maneuver"]["instruction"] for step in leg["steps"]],
                }
        except Exception as e:
            logger.error(f"Routing error: {e}")
            raise HTTPException(
                status_code=502, detail="Failed to fetch open routing data"
            )

    async def geocode(self, address: str) -> dict:
        """
        Convert address to coordinates using Nominatim.
        """
        try:
            # geopy is blocking, use to_thread
            location = await asyncio.to_thread(self.geolocator.geocode, address)
            if location:
                return {"lat": location.latitude, "lng": location.longitude}
            return {}
        except GeopyError as e:
            logger.error(f"Geocoding error: {e}")
            raise HTTPException(
                status_code=502, detail="Failed to geocode address via OpenStreetMap"
            )

    async def snap_to_roads(self, path: list[tuple]) -> list[dict]:
        """
        OSRM Nearest API can be used for snapping.
        Simple implementation returning original path for now.
        """
        return [{"location": [p[0], p[1]]} for p in path]
