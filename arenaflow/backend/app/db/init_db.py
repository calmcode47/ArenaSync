import logging
import uuid
from sqlalchemy import text
from app.db.session import engine, Base
from app.core.config import settings
from app.core.security import get_password_hash
from app.db import base  # Ensures models are imported for metadata generation

logger = logging.getLogger(__name__)

async def init_db() -> None:
    if not settings.is_production:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            
    try:
        async with engine.begin() as conn:
            result = await conn.execute(
                text("SELECT count(*) FROM users WHERE role = 'admin'")
            )
            count = result.scalar()
            
            if count == 0:
                if settings.ADMIN_EMAIL and settings.ADMIN_PASSWORD:
                    hashed_pwd = get_password_hash(settings.ADMIN_PASSWORD)
                    new_id = str(uuid.uuid4())
                    await conn.execute(
                        text("""
                        INSERT INTO users (id, email, hashed_password, role, is_active)
                        VALUES (:id, :email, :password, 'admin', true)
                        """),
                        {"id": new_id, "email": settings.ADMIN_EMAIL, "password": hashed_pwd}
                    )
                    logger.info(f"Admin user seeded: {settings.ADMIN_EMAIL}")
                else:
                    logger.warning("Admin email or password missing in environment — skipping seed.")
            else:
                logger.info("Admin user already exists — skipping seed")
    except Exception as e:
        logger.warning(f"Could not seed admin user. Tables might not exist yet: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(init_db())
