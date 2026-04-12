import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def test_register_success(client: AsyncClient, fake):
    email = fake.email()
    data = {
        "email": email,
        "password": "Password123!",
        "full_name": fake.name()
    }
    response = await client.post("/api/v1/auth/register", json=data)
    assert response.status_code == 201
    assert response.json()["email"] == email

async def test_register_duplicate_email(client: AsyncClient, test_user, fake):
    user, _ = test_user
    data = {
        "email": user.email,
        "password": "Password123!",
        "full_name": fake.name()
    }
    response = await client.post("/api/v1/auth/register", json=data)
    assert response.status_code == 409

async def test_register_invalid_email(client: AsyncClient, fake):
    data = {"email": "invalidemail", "password": "pass", "full_name": "Test"}
    response = await client.post("/api/v1/auth/register", json=data)
    assert response.status_code == 422

async def test_login_success(client: AsyncClient, test_user):
    user, _ = test_user
    data = {"username": user.email, "password": "password123"}
    response = await client.post("/api/v1/auth/login", data=data)
    assert response.status_code == 200
    assert "access_token" in response.json()

async def test_login_wrong_password(client: AsyncClient, test_user):
    user, _ = test_user
    data = {"username": user.email, "password": "wrongpassword"}
    response = await client.post("/api/v1/auth/login", data=data)
    assert response.status_code == 401

async def test_login_nonexistent_user(client: AsyncClient):
    data = {"username": "nobody@example.com", "password": "password123"}
    response = await client.post("/api/v1/auth/login", data=data)
    assert response.status_code == 401

async def test_get_me_authenticated(client: AsyncClient, test_user, auth_headers):
    user, token = test_user
    response = await client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert response.status_code == 200
    assert response.json()["email"] == user.email

async def test_get_me_unauthenticated(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401

async def test_update_profile(client: AsyncClient, test_user, auth_headers):
    _, token = test_user
    data = {"full_name": "New Name Updated"}
    response = await client.patch("/api/v1/auth/me", json=data, headers=auth_headers(token))
    assert response.status_code == 200
    assert response.json()["full_name"] == "New Name Updated"
