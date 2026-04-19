import logging
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from fastapi import HTTPException, status

from app.models.crowd_snapshot import CrowdSnapshot
from app.models.zone import Zone
from app.schemas.crowd import (
    CrowdSnapshotCreate, CrowdSnapshotOut, VenueCrowdSummary,
    ZoneCrowdStatus, CrowdHeatmapPoint, VenueHeatmapOut
)
from app.core.redis_client import set_cached, get_cached
from app.core.config import settings
import random

logger = logging.getLogger(__name__)

class CrowdService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def record_snapshot(self, data: CrowdSnapshotCreate) -> CrowdSnapshotOut:
        stmt = select(Zone).where(Zone.id == data.zone_id)
        result = await self.db.execute(stmt)
        zone = result.scalar_one_or_none()
        
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")

        density_score = min(data.current_count / zone.capacity, 1.0) if zone.capacity > 0 else 1.0
        
        if density_score < 0.5:
            congestion_level = "low"
        elif density_score < 0.7:
            congestion_level = "moderate"
        elif density_score < 0.85:
            congestion_level = "high"
        else:
            congestion_level = "critical"

        venue_id = data.venue_id or zone.venue_id
        if data.venue_id and data.venue_id != zone.venue_id:
            raise HTTPException(status_code=409, detail="venue_id does not match zone_id")

        snapshot = CrowdSnapshot(
            zone_id=data.zone_id,
            venue_id=venue_id,
            current_count=data.current_count,
            density_score=density_score,
            congestion_level=congestion_level,
            flow_direction=data.flow_direction or {"dx": 0, "dy": 0},
            recorded_at=datetime.now(timezone.utc)
        )
        self.db.add(snapshot)
        await self.db.commit()
        await self.db.refresh(snapshot)

        cache_key = f"crowd:{str(data.zone_id)}:latest"
        snapshot_out = CrowdSnapshotOut.model_validate(snapshot)
        await set_cached(cache_key, snapshot_out.model_dump(mode="json"), ttl_seconds=30)

        if congestion_level in ["high", "critical"]:
            from app.services.alert_service import AlertService
            alert_service = AlertService(self.db)
            await alert_service.auto_alert_from_crowd(data.zone_id, venue_id, congestion_level)

        return snapshot_out

    async def get_venue_summary(self, venue_id: UUID) -> VenueCrowdSummary:
        if settings.DEMO_MODE:
            return self._get_mock_summary(venue_id)

        try:
            cache_key = f"crowd:summary:{str(venue_id)}"
            cached = await get_cached(cache_key)
            if cached:
                return VenueCrowdSummary.model_validate(cached)

            zones_result = await self.db.execute(select(Zone).where(Zone.venue_id == venue_id))
            zones = zones_result.scalars().all()
            
            zone_statuses = []
            total_current_count = 0
            total_capacity = 0
            
            for zone in zones:
                stmt = select(CrowdSnapshot).where(CrowdSnapshot.zone_id == zone.id).order_by(desc(CrowdSnapshot.recorded_at)).limit(1)
                snap_result = await self.db.execute(stmt)
                latest_snap = snap_result.scalar_one_or_none()
                
                if latest_snap:
                    count = latest_snap.current_count
                    density = latest_snap.density_score
                    congestion = latest_snap.congestion_level
                else:
                    count, density, congestion = 0, 0.0, "low"

                zone_statuses.append(ZoneCrowdStatus(
                    zone_id=zone.id,
                    zone_name=zone.name,
                    zone_type=zone.zone_type,
                    density_score=density,
                    congestion_level=congestion,
                    current_count=count,
                    capacity=zone.capacity
                ))
                total_current_count += count
                total_capacity += zone.capacity

            occupancy_pct = (total_current_count / total_capacity * 100) if total_capacity > 0 else 0.0

            summary = VenueCrowdSummary(
                venue_id=venue_id,
                total_current_count=total_current_count,
                total_capacity=total_capacity,
                overall_occupancy_pct=occupancy_pct,
                zones=zone_statuses
            )
            await set_cached(cache_key, summary.model_dump(mode="json"), ttl_seconds=15)
            return summary
        except Exception as e:
            if settings.DEMO_MODE or "connection" in str(e).lower():
                return self._get_mock_summary(venue_id)
            raise e

    def _get_mock_summary(self, venue_id: UUID) -> VenueCrowdSummary:
        # Generate dynamic jitter (±3%)
        jitter = lambda x: int(x * random.uniform(0.97, 1.03))
        
        zone_statuses = [
            ZoneCrowdStatus(
                zone_id=UUID("11111111-1111-1111-1111-111111111111"),
                zone_name="Main Entrance",
                zone_type="entrance",
                density_score=random.uniform(0.80, 0.90),
                congestion_level="high",
                current_count=jitter(4250),
                capacity=5000,
                latitude=40.7515,
                longitude=-73.9934
            ),
            ZoneCrowdStatus(
                zone_id=UUID("22222222-2222-2222-2222-222222222222"),
                zone_name="East Concourse",
                zone_type="concourse",
                density_score=random.uniform(0.10, 0.30),
                congestion_level="low",
                current_count=jitter(900),
                capacity=2000,
                latitude=40.7505,
                longitude=-73.9924
            ),
            ZoneCrowdStatus(
                zone_id=UUID("33333333-3333-3333-3333-333333333333"),
                zone_name="Section 108",
                zone_type="seating",
                density_score=random.uniform(0.90, 0.98),
                congestion_level="critical",
                current_count=jitter(736),
                capacity=800,
                latitude=40.7495,
                longitude=-73.9934
            )
        ]
        
        total_count = sum(z.current_count for z in zone_statuses)
        total_cap = sum(z.capacity for z in zone_statuses)
        
        return VenueCrowdSummary(
            venue_id=venue_id,
            total_current_count=total_count,
            total_capacity=total_cap,
            overall_occupancy_pct=round((total_count / total_cap * 100), 2),
            zones=zone_statuses
        )

    async def get_heatmap(self, venue_id: UUID) -> VenueHeatmapOut:
        if settings.DEMO_MODE:
            return self._get_mock_heatmap(venue_id)
            
        try:
            zones_result = await self.db.execute(select(Zone).where(Zone.venue_id == venue_id))
            zones = zones_result.scalars().all()
            
            points = []
            for zone in zones:
                stmt = select(CrowdSnapshot).where(CrowdSnapshot.zone_id == zone.id).order_by(desc(CrowdSnapshot.recorded_at)).limit(1)
                snap_result = await self.db.execute(stmt)
                latest_snap = snap_result.scalar_one_or_none()
                
                if latest_snap and latest_snap.density_score > 0:
                    points.append(CrowdHeatmapPoint(
                        latitude=zone.latitude,
                        longitude=zone.longitude,
                        weight=latest_snap.density_score
                    ))
                    
            return VenueHeatmapOut(
                venue_id=venue_id,
                points=points,
                generated_at=datetime.now(timezone.utc)
            )
        except Exception:
            return self._get_mock_heatmap(venue_id)

    def _get_mock_heatmap(self, venue_id: UUID) -> VenueHeatmapOut:
        # MSG Base Coords
        lat, lng = 40.7505, -73.9934
        points = []
        # Generate 50 mock points clustered around the venue
        for _ in range(50):
            points.append(CrowdHeatmapPoint(
                latitude=lat + random.uniform(-0.002, 0.002),
                longitude=lng + random.uniform(-0.002, 0.002),
                weight=random.uniform(0.2, 1.0)
            ))
        return VenueHeatmapOut(
            venue_id=venue_id,
            points=points,
            generated_at=datetime.now(timezone.utc)
        )

    async def get_historical(self, zone_id: UUID, hours: int = 24) -> list[CrowdSnapshotOut]:
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        stmt = select(CrowdSnapshot).where(CrowdSnapshot.zone_id == zone_id, CrowdSnapshot.recorded_at >= cutoff).order_by(CrowdSnapshot.recorded_at)
        result = await self.db.execute(stmt)
        snapshots = result.scalars().all()
        
        return [CrowdSnapshotOut.model_validate(s) for s in snapshots]
