import asyncio
import uuid
from app.db import base
from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash

async def create_user(email: str, password: str, full_name: str, role: str):
    async with AsyncSessionLocal() as session:
        # Check if already exists
        from sqlalchemy import select
        res = await session.execute(select(User).where(User.email == email))
        if res.scalars().first():
            print(f"User {email} already exists.")
            return

        new_user = User(
            id=uuid.uuid4(),
            email=email,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=role,
            is_active=True
        )
        session.add(new_user)
        await session.commit()
        print(f"User {email} created successfully.")

if __name__ == "__main__":
    asyncio.run(create_user(
        'mayankjoshi9877973895@gmail.com',
        'ArenaFlow2026!',
        'Mayank Joshi',
        'attendee'
    ))
