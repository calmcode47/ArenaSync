from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=5,              # Supabase free tier: max 60 connections, be conservative
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=300,         # Recycle connections every 5 min (Supabase closes idle at 6min)
    pool_pre_ping=True,       # Verify connection health before use
    echo=settings.APP_ENV == "development",
    connect_args={
        "prepared_statement_cache_size": 0,   # Required for PgBouncer transaction mode
        "server_settings": {
            "jit": "off"                      # Disable JIT for PgBouncer compatibility
        }
    }
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
