import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def test_record_snapshot_staff(client: AsyncClient, test_staff, test_venue, auth_headers):
    _, token = test_staff
    _, zones = test_venue
    data = {
        "zone_id": str(zones[0].id),
        "current_count": 500,
        "capture_source": "camera",
        "reliability_score": 0.95
    }
    res = await client.post("/api/v1/crowd/snapshot", json=data, headers=auth_headers(token))
    assert res.status_code == 201
    assert res.json()["current_count"] == 500

async def test_record_snapshot_attendee_forbidden(client: AsyncClient, test_user, test_venue, auth_headers):
    _, token = test_user
    _, zones = test_venue
    data = {
        "zone_id": str(zones[0].id),
        "current_count": 500,
        "capture_source": "camera"
    }
    res = await client.post("/api/v1/crowd/snapshot", json=data, headers=auth_headers(token))
    assert res.status_code == 403

async def test_get_venue_summary(client: AsyncClient, test_staff, test_venue, auth_headers):
    _, token = test_staff
    venue, zones = test_venue
    
    data = {
        "zone_id": str(zones[0].id),
        "current_count": 100,
        "capture_source": "manual"
    }
    await client.post("/api/v1/crowd/snapshot", json=data, headers=auth_headers(token))
    
    res = await client.get(f"/api/v1/crowd/venue/{venue.id}/summary")
    assert res.status_code == 200
    res_data = res.json()
    assert "total_current_count" in res_data
    assert "zones" in res_data
    assert len(res_data["zones"]) == 4

async def test_get_heatmap(client: AsyncClient, test_venue):
    venue, _ = test_venue
    res = await client.get(f"/api/v1/crowd/venue/{venue.id}/heatmap")
    assert res.status_code == 200
    assert "points" in res.json()
    assert isinstance(res.json()["points"], list)

async def test_get_zone_history(client: AsyncClient, test_staff, test_venue, auth_headers):
    _, token = test_staff
    _, zones = test_venue
    for count in [100, 150]:
        await client.post("/api/v1/crowd/snapshot", json={"zone_id": str(zones[0].id), "current_count": count}, headers=auth_headers(token))
        
    res = await client.get(f"/api/v1/crowd/zone/{zones[0].id}/history")
    assert res.status_code == 200
    assert len(res.json()) >= 2

async def test_density_score_computation(client: AsyncClient, test_staff, test_venue, auth_headers):
    _, token = test_staff
    venue, zones = test_venue
    await client.post("/api/v1/crowd/snapshot", json={"zone_id": str(zones[0].id), "current_count": 1250}, headers=auth_headers(token))
    
    res = await client.get(f"/api/v1/crowd/venue/{venue.id}/summary")
    zone_stat = next(z for z in res.json()["zones"] if z["zone_id"] == str(zones[0].id))
    assert zone_stat["density_score"] == 0.5

async def test_congestion_level_low(client: AsyncClient, test_staff, test_venue, auth_headers):
    _, token = test_staff
    venue, zones = test_venue
    await client.post("/api/v1/crowd/snapshot", json={"zone_id": str(zones[0].id), "current_count": 250}, headers=auth_headers(token))
    res = await client.get(f"/api/v1/crowd/venue/{venue.id}/summary")
    zone_stat = next(z for z in res.json()["zones"] if z["zone_id"] == str(zones[0].id))
    assert zone_stat["congestion_level"] == "low"

async def test_congestion_level_critical(client: AsyncClient, test_staff, test_venue, auth_headers):
    _, token = test_staff
    venue, zones = test_venue
    await client.post("/api/v1/crowd/snapshot", json={"zone_id": str(zones[0].id), "current_count": 2250}, headers=auth_headers(token))
    res = await client.get(f"/api/v1/crowd/venue/{venue.id}/summary")
    zone_stat = next(z for z in res.json()["zones"] if z["zone_id"] == str(zones[0].id))
    assert zone_stat["congestion_level"] == "critical"

async def test_auto_alert_on_critical(client: AsyncClient, test_staff, test_venue, auth_headers):
    admin_token = test_staff[1] 
    _, zones = test_venue
    
    await client.post("/api/v1/crowd/snapshot", json={"zone_id": str(zones[0].id), "current_count": 2400}, headers=auth_headers(admin_token))
    
    res = await client.get(f"/api/v1/alerts/venue/{zones[0].venue_id}", headers=auth_headers(admin_token))
    alerts = res.json()
    assert any(a["alert_type"] == "overcrowding" for a in alerts)
