import logging
import googlemaps
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

class MapsService:
    def __init__(self):
        try:
            self.gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)
        except Exception as e:
            logger.error(f"Failed to initialize Google Maps client: {e}")
            self.gmaps = None

    def _ensure_client(self):
        if not self.gmaps:
            raise HTTPException(status_code=500, detail="Google Maps integration not configured")

    async def get_venue_details(self, place_id: str) -> dict:
        self._ensure_client()
        try:
            place = self.gmaps.place(
                place_id=place_id, 
                fields=['name', 'formatted_address', 'geometry', 'opening_hours']
            )
            return place.get('result', {})
        except Exception as e:
            logger.error(f"Google Maps API error: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch venue details")

    async def get_directions(self, origin: tuple, destination: tuple, mode: str = "walking") -> dict:
        self._ensure_client()
        try:
            directions = self.gmaps.directions(origin, destination, mode=mode)
            if not directions:
                return {}
            
            leg = directions[0]['legs'][0]
            return {
                "distance": leg['distance']['text'],
                "duration": leg['duration']['text'],
                "steps": [step['html_instructions'] for step in leg['steps']]
            }
        except Exception as e:
            logger.error(f"Google Maps API error: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch directions")

    async def geocode(self, address: str) -> dict:
        self._ensure_client()
        try:
            res = self.gmaps.geocode(address)
            if res:
                return res[0]['geometry']['location']
            return {}
        except Exception as e:
            logger.error(f"Google Maps API error: {e}")
            raise HTTPException(status_code=502, detail="Failed to geocode address")

    async def snap_to_roads(self, path: list[tuple]) -> list[dict]:
        self._ensure_client()
        try:
            res = self.gmaps.snap_to_roads(path)
            return res
        except Exception as e:
            logger.error(f"Google Maps API error: {e}")
            raise HTTPException(status_code=502, detail="Failed to snap paths to roads")
