import asyncio
from app.db import base
from app.db.session import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select, update

async def promote_user(email: str):
    async with AsyncSessionLocal() as session:
        # Check if already exists
        res = await session.execute(select(User).where(User.email == email))
        user = res.scalars().first()
        if not user:
            print(f"User {email} not found.")
            return

        print(f"Current role: {user.role}")
        
        await session.execute(
            update(User)
            .where(User.email == email)
            .values(role='admin')
        )
        await session.commit()
        print(f"User {email} promoted to admin successfully.")

if __name__ == "__main__":
    asyncio.run(promote_user('mayankjoshi9877973895@gmail.com'))
