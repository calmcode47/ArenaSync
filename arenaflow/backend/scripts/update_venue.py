import asyncio
import uuid
from app.db import base
from app.db.session import AsyncSessionLocal
from app.models.venue import Venue
from sqlalchemy import update

async def update_venue_meta(venue_id: str):
    async with AsyncSessionLocal() as session:
        # Stanford Stadium Place ID as a demo
        place_id = "ChIJ_3_3_3_3_3_3_3_3_3_3_3" # Replace with a real one if possible, but placeholder is fine to stop 409
        
        await session.execute(
            update(Venue)
            .where(Venue.id == uuid.UUID(venue_id))
            .values(google_place_id="ChIJN1t_tDeuEmsRUsoyG83frY4") # Opera House place ID for demo
        )
        await session.commit()
        print(f"Venue {venue_id} updated with google_place_id")

if __name__ == "__main__":
    asyncio.run(update_venue_meta('77fc4bb0-0717-43e4-843b-0714703139ff'))
