import asyncio
from app.db import base # Added to ensure all models are imported for mapper initialization
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select

async def check_user(email: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if user:
            print(f"User found: {user.email}")
            print(f"Role: {user.role}")
            print(f"Is active: {user.is_active}")
            print(f"Has hashed password: {user.hashed_password != ''}")
        else:
            print(f"User NOT found: {email}")

async def list_all_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print(f"Total users in database: {len(users)}")
        for u in users:
            print(f"- {u.email} (Role: {u.role}, Active: {u.is_active})")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        email = sys.argv[1]
        asyncio.run(check_user(email))
    else:
        asyncio.run(list_all_users())
