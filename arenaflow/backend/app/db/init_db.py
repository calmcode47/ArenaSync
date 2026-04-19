import logging
import uuid

from sqlalchemy import text

from app.core.config import settings
from app.core.security import get_password_hash
from app.db import base  # Ensures models are imported for metadata generation
from app.db.session import Base, engine

logger = logging.getLogger(__name__)

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool


async def init_db() -> None:
    # Use synchronous engine with psycopg2 for Supabase initialization (best for PgBouncer)
    sync_url = settings.DATABASE_MIGRATION_URL or settings.DATABASE_URL.replace(
        "postgresql+asyncpg://", "postgresql+psycopg2://"
    )
    sync_engine = create_engine(sync_url, poolclass=NullPool)

    try:
        with sync_engine.connect() as conn:
            # 1. Seed Admin User
            result = conn.execute(
                text("SELECT count(*) FROM users WHERE email = :email"),
                {"email": settings.ADMIN_EMAIL},
            )
            count = result.scalar()

            if count == 0:
                if settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
                    hashed_pwd = get_password_hash(settings.ADMIN_PASSWORD)
                    new_id = str(uuid.uuid4())
                    conn.execute(
                        text(
                            """
                        INSERT INTO users (id, email, hashed_password, full_name, role, is_active)
                        VALUES (:id, :email, :password, 'ArenaFlow Admin', 'admin', true)
                        """
                        ),
                        {
                            "id": new_id,
                            "email": settings.ADMIN_EMAIL,
                            "password": hashed_pwd,
                        },
                    )
                    conn.commit()
                    logger.info(f"Admin user seeded: {settings.ADMIN_EMAIL}")
                else:
                    logger.warning(
                        "Admin email or password missing in environment — skipping seed."
                    )
            else:
                logger.info("Admin user already exists — skipping seed")

    except Exception as e:
        logger.error(f"Seeding operation failed: {e}")
    finally:
        sync_engine.dispose()


if __name__ == "__main__":
    import asyncio

    asyncio.run(init_db())
