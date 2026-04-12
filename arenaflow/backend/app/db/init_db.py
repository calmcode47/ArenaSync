import logging
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
                text("SELECT count(id) FROM users WHERE email = :email"),
                {"email": settings.ADMIN_EMAIL}
            )
            count = result.scalar()
            
            if count == 0:
                hashed_pwd = get_password_hash(settings.ADMIN_PASSWORD)
                await conn.execute(
                    text("""
                    INSERT INTO users (email, hashed_password, is_active, is_superuser)
                    VALUES (:email, :password, true, true)
                    """),
                    {"email": settings.ADMIN_EMAIL, "password": hashed_pwd}
                )
                logger.info(f"Created default admin user: {settings.ADMIN_EMAIL}")
    except Exception as e:
        logger.warning(f"Could not seed admin user. Tables might not exist yet: {e}")
