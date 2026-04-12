import os
import asyncio
import pytest
import pytest_asyncio
from faker import Faker
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator

# Set test environment constraints before imports evaluate
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/arenaflow_test"
os.environ["SECRET_KEY"] = "test_super_secret_key"
os.environ["ALGORITHM"] = "HS256"

from app.core.config import settings
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User
from app.models.venue import Venue
from app.models.zone import Zone
from app.core.security import create_access_token, get_password_hash

engine = create_async_engine(settings.DATABASE_URL, echo=False)
TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function")
async def test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestingSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield test_db
        
    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest.fixture
def fake():
    return Faker()

@pytest_asyncio.fixture
async def test_user(test_db: AsyncSession, fake: Faker):
    user = User(
        email=fake.email(),
        hashed_password=get_password_hash("password123"),
        full_name=fake.name(),
        role="attendee"
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return user, token

@pytest_asyncio.fixture
async def test_admin(test_db: AsyncSession, fake: Faker):
    user = User(
        email=fake.email(),
        hashed_password=get_password_hash("password123"),
        full_name=fake.name(),
        role="admin"
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return user, token

@pytest_asyncio.fixture
async def test_staff(test_db: AsyncSession, fake: Faker):
    user = User(
        email=fake.email(),
        hashed_password=get_password_hash("password123"),
        full_name=fake.name(),
        role="staff"
    )
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    token = create_access_token(data={"sub": user.email, "role": user.role})
    return user, token

@pytest_asyncio.fixture
async def test_venue(test_db: AsyncSession, fake: Faker):
    venue = Venue(
        name=fake.company() + " Arena",
        city=fake.city(),
        country=fake.country(),
        total_capacity=10000,
        latitude=40.7128,
        longitude=-74.0060
    )
    test_db.add(venue)
    await test_db.commit()
    await test_db.refresh(venue)

    zones = []
    zone_types = ["gate", "concession", "seating", "emergency_exit"]
    for i in range(4):
        zone = Zone(
            venue_id=venue.id,
            name=f"Zone {i+1}",
            zone_type=zone_types[i],
            capacity=2500,
            latitude=40.7128 + (i * 0.001),
            longitude=-74.0060 + (i * 0.001)
        )
        test_db.add(zone)
        zones.append(zone)
    await test_db.commit()
    
    return venue, zones

@pytest.fixture
def auth_headers():
    def _auth_headers(token: str):
        return {"Authorization": f"Bearer {token}"}
    return _auth_headers
