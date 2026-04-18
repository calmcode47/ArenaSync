"""
seed_demo.py — Idempotent demo data seeder for hackathon judging.

Run with: python -m scripts.seed_demo
"""

import sys
import os
import uuid
import logging
import asyncio
from typing import List, Dict, Any
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import select, func, text
from app.db import base # Added for mapper initialization
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.models.venue import Venue
from app.models.zone import Zone
from app.models.crowd_snapshot import CrowdSnapshot
from app.models.queue_entry import QueueEntry
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@arenaflow.app")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "ArenaFlow2026!")

DEMO_STAFF_EMAIL = os.getenv("DEMO_STAFF_EMAIL", "demo@arenaflow.app")
DEMO_STAFF_PASSWORD = os.getenv("DEMO_STAFF_PASSWORD", "ArenaFlow2026!")

ZONES_DATA = [
    {"name": "North Gate", "type": "gate", "capacity": 2000, "lat": 37.7759, "lng": -122.4194},
    {"name": "South Gate", "type": "gate", "capacity": 2000, "lat": 37.7739, "lng": -122.4194},
    {"name": "Concession A", "type": "concession", "capacity": 500, "lat": 37.7749, "lng": -122.4180},
    {"name": "Concession B", "type": "concession", "capacity": 500, "lat": 37.7749, "lng": -122.4208},
    {"name": "Restroom Block 1", "type": "restroom", "capacity": 200, "lat": 37.7752, "lng": -122.4185},
    {"name": "Main Seating", "type": "seating", "capacity": 40000, "lat": 37.7749, "lng": -122.4194},
]

def make_polygon(lat: float, lng: float) -> List[Dict[str, float]]:
    delta = 0.0005
    return [
        {"lat": lat + delta, "lng": lng - delta},
        {"lat": lat + delta, "lng": lng + delta},
        {"lat": lat - delta, "lng": lng + delta},
        {"lat": lat - delta, "lng": lng - delta},
    ]

async def seed_user(session, email, password, full_name, role) -> None:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if not user:
        user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role,
            is_active=True
        )
        session.add(user)
        logger.info(f"Seeded user: {email} ({role})")
    else:
        logger.info(f"User {email} already exists.")

async def seed_venue(session) -> str:
    result = await session.execute(select(Venue).where(Venue.name == "ArenaFlow Stadium"))
    venue = result.scalars().first()
    if not venue:
        venue = Venue(
            id=uuid.uuid4(),
            name="ArenaFlow Stadium",
            city="San Francisco",
            country="United States",
            total_capacity=45000,
            latitude=37.7749,
            longitude=-122.4194,
            config_json={"sections": ["North", "South", "East", "West"]},
            is_active=True
        )
        session.add(venue)
        await session.flush()
        logger.info(f"Seeded venue: ArenaFlow Stadium")
    else:
        logger.info("Venue ArenaFlow Stadium already exists.")
    return str(venue.id)

async def seed_zone(session, venue_id: str, zone_data: dict) -> str:
    result = await session.execute(
        select(Zone).where(Zone.venue_id == venue_id).where(Zone.name == zone_data["name"])
    )
    zone = result.scalars().first()
    if not zone:
        zone = Zone(
            id=uuid.uuid4(),
            venue_id=venue_id,
            name=zone_data["name"],
            zone_type=zone_data["type"],
            capacity=zone_data["capacity"],
            latitude=zone_data["lat"],
            longitude=zone_data["lng"],
            polygon_coords=make_polygon(zone_data["lat"], zone_data["lng"]),
            is_active=True
        )
        session.add(zone)
        await session.flush()
        logger.info(f"Seeded zone: {zone.name}")
    else:
        pass # Already exists
    return str(zone.id)

async def seed_snapshots(session, venue_id: str, zone_id: str, capacity: int, zone_type: str) -> int:
    result = await session.execute(select(func.count(CrowdSnapshot.id)).where(CrowdSnapshot.zone_id == zone_id))
    count = result.scalar() or 0
    if count >= 50:
        return 0

    now = datetime.now(timezone.utc)
    inserts = 0
    for i in range(50):
        t = now - timedelta(hours=3) + timedelta(minutes=(3.6 * i))
        
        if zone_type == "gate":
            count_val = capacity * (1 - (i / 50.0)**2) * 0.9
        elif zone_type == "concession":
            peak_factor = 1.0 - abs((i - 25) / 25.0)
            count_val = capacity * peak_factor * 0.8
        else: # seating or others
            count_val = capacity * (i / 50.0) * 0.95

        count_val = max(10, int(count_val))
        density = min(1.0, count_val / float(capacity))
        
        if density < 0.3:
            congestion = "low"
        elif density < 0.6:
            congestion = "moderate"
        elif density < 0.85:
            congestion = "high"
        else:
            congestion = "critical"
            
        snapshot = CrowdSnapshot(
            id=uuid.uuid4(),
            zone_id=zone_id,
            venue_id=venue_id,
            current_count=count_val,
            density_score=density,
            congestion_level=congestion,
            flow_direction={"inflow": count_val * 0.1, "outflow": count_val * 0.05},
            recorded_at=t
        )
        session.add(snapshot)
        inserts += 1

    return inserts

async def seed_queues(session, venue_id: str, zone_id: str, zone_type: str) -> int:
    if zone_type not in ["gate", "concession"]:
        return 0
        
    result = await session.execute(select(func.count(QueueEntry.id)).where(QueueEntry.zone_id == zone_id))
    count = result.scalar() or 0
    if count >= 50:
        return 0

    service_rate = 15.0 if zone_type == "gate" else 8.0
    now = datetime.now(timezone.utc)
    inserts = 0
    
    for i in range(50):
        t = now - timedelta(hours=3) + timedelta(minutes=(3.6 * i))
        
        if zone_type == "gate":
            q_len = 200 * (1 - (i / 50.0)**2)
        else:
            peak_factor = 1.0 - abs((i - 25) / 25.0)
            q_len = 50 * peak_factor
            
        q_len = max(0, int(q_len))
        est_wait = q_len / service_rate
        
        entry = QueueEntry(
            id=uuid.uuid4(),
            zone_id=zone_id,
            venue_id=venue_id,
            queue_length=q_len,
            estimated_wait_minutes=est_wait,
            actual_wait_minutes=est_wait * 0.9,
            service_rate=service_rate,
            recorded_at=t
        )
        session.add(entry)
        inserts += 1

    return inserts

async def main():
    async with AsyncSessionLocal() as session:
        try:
            await seed_user(session, ADMIN_EMAIL, ADMIN_PASSWORD, "ArenaFlow Admin", "admin")
            await seed_user(session, DEMO_STAFF_EMAIL, DEMO_STAFF_PASSWORD, "Demo Staff", "staff")
            
            venue_id = await seed_venue(session)
            
            zones_created = 0
            snapshots_inserted = 0
            queues_inserted = 0
            
            for zd in ZONES_DATA:
                zone_id = await seed_zone(session, venue_id, zd)
                zones_created += 1
                
                s_ins = await seed_snapshots(session, venue_id, zone_id, zd["capacity"], zd["type"])
                snapshots_inserted += s_ins
                
                q_ins = await seed_queues(session, venue_id, zone_id, zd["type"])
                queues_inserted += q_ins
                
            await session.commit()
            
            print("════════════════════════════════")
            print("ArenaFlow Demo Seed Complete")
            print("════════════════════════════════")
            print(f"Admin:    {ADMIN_EMAIL}")
            print(f"Staff:    {DEMO_STAFF_EMAIL}  ← use this for frontend demo login")
            print(f"Password: {DEMO_STAFF_PASSWORD}")
            print(f"Venue ID: {venue_id}         ← paste this into the VenueSelector modal")
            print(f"Zones:    {zones_created} created/verified")
            print(f"Snapshots: {snapshots_inserted} inserted")
            print(f"Queue entries: {queues_inserted} inserted")
            print("════════════════════════════════")

        except Exception as e:
            await session.rollback()
            logger.error(f"Error seeding demo: {e}")

if __name__ == "__main__":
    asyncio.run(main())
