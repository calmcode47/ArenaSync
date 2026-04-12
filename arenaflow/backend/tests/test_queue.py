import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def test_record_queue_entry(client: AsyncClient, test_staff, test_venue, auth_headers):
    _, token = test_staff
    _, zones = test_venue
    
    data = {
        "zone_id": str(zones[0].id),
        "queue_length": 50,
        "entry_source": "camera"
    }
    res = await client.post("/api/v1/queue/record", json=data, headers=auth_headers(token))
    assert res.status_code == 201
    res_data = res.json()
    assert "estimated_wait_minutes" in res_data
    assert res_data["queue_length"] == 50

async def test_get_venue_queue_summary(client: AsyncClient, test_venue):
    venue, zones = test_venue
    res = await client.get(f"/api/v1/queue/venue/{venue.id}/summary")
    assert res.status_code == 200
    res_data = res.json()
    assert "total_global_queue_length" in res_data
    assert "average_wait_minutes" in res_data

async def test_queue_prediction_insufficient_data(client: AsyncClient, test_staff, test_venue, auth_headers):
    _, token = test_staff
    venue, zones = test_venue
    
    data = {
        "zone_id": str(zones[0].id),
        "queue_length": 100,
        "entry_source": "manual"
    }
    await client.post("/api/v1/queue/record", json=data, headers=auth_headers(token))
    
    res = await client.get(f"/api/v1/queue/venue/{venue.id}/summary")
    zone_stat = next(z for z in res.json()["zones"] if z["zone_id"] == str(zones[0].id))
    
    assert zone_stat["estimated_wait_minutes"] > 0
    assert zone_stat["confidence_score"] < 0.6 

async def test_update_actual_wait(client: AsyncClient, test_admin, test_venue, auth_headers):
    _, token = test_admin
    _, zones = test_venue
    
    data = {"zone_id": str(zones[0].id), "queue_length": 30}
    res = await client.post("/api/v1/queue/record", json=data, headers=auth_headers(token))
    entry_id = res.json()["id"]
    
    upd_res = await client.patch(f"/api/v1/queue/entry/{entry_id}/actual-wait", params={"actual_wait_minutes": 15.5}, headers=auth_headers(token))
    assert upd_res.status_code == 200
    assert upd_res.json()["actual_wait_minutes"] == 15.5

async def test_best_worst_zone_identification(client: AsyncClient, test_staff, test_venue, auth_headers):
    _, token = test_staff
    venue, zones = test_venue
    
    await client.post("/api/v1/queue/record", json={"zone_id": str(zones[0].id), "queue_length": 5}, headers=auth_headers(token))
    await client.post("/api/v1/queue/record", json={"zone_id": str(zones[1].id), "queue_length": 200}, headers=auth_headers(token))
    await client.post("/api/v1/queue/record", json={"zone_id": str(zones[2].id), "queue_length": 50}, headers=auth_headers(token))
    
    res = await client.get(f"/api/v1/queue/venue/{venue.id}/summary")
    summary = res.json()
    
    assert summary["best_zone_id"] == str(zones[0].id)
    assert summary["worst_zone_id"] == str(zones[1].id)
