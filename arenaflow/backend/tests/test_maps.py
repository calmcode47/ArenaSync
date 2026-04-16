import pytest
from httpx import AsyncClient


pytestmark = pytest.mark.asyncio


async def test_get_local_venue_payload(client: AsyncClient, test_venue):
    venue, _ = test_venue
    response = await client.get(f"/api/v1/maps/venue/{venue.id}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(venue.id)
    assert "zones" in body


async def test_get_venue_details_without_place_id_returns_conflict(client: AsyncClient, test_venue):
    venue, _ = test_venue
    response = await client.get(f"/api/v1/maps/venue/{venue.id}/details")
    assert response.status_code == 409


async def test_health_endpoints_are_mounted(client: AsyncClient):
    basic = await client.get("/health")
    detailed = await client.get("/health/detailed")
    assert basic.status_code == 200
    assert detailed.status_code == 200
