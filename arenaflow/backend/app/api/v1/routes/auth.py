from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.dependencies import get_db, get_current_user, limiter
from app.models.user import User
from app.schemas.user import TokenOut, UserCreate, UserOut, UserUpdate
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.firebase import firebase_client
from app.core.config import settings

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Register a new user."""
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="The user with this email already exists in the system."
        )
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        preferred_language=user_in.preferred_language,
        role="attendee"
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Login and get a JWT."""
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive user")

    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role, "email": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/firebase-login", response_model=TokenOut)
@limiter.limit("10/minute")
async def firebase_login(
    request: Request,
    id_token: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Login or register via Firebase ID token."""
    decoded_token = await firebase_client.verify_token(id_token)
    if not decoded_token:
        raise HTTPException(status_code=401, detail="Invalid Firebase token")
        
    uid = decoded_token.get("uid")
    email = decoded_token.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Token has no email")
        
    result = await db.execute(select(User).where(User.firebase_uid == uid))
    user = result.scalars().first()
    
    if not user:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if user:
            user.firebase_uid = uid
        else:
            user = User(
                email=email,
                hashed_password="",
                full_name=decoded_token.get("name", "Firebase User"),
                firebase_uid=uid,
                role="attendee"
            )
            db.add(user)
            
    await db.commit()
    await db.refresh(user)
    
    access_token = create_access_token(
        subject=str(user.id),
        extra_claims={"role": user.role, "email": user.email},
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
async def read_user_me(
    current_user: User = Depends(get_current_user)
) -> Any:
    """Get current user profile."""
    return current_user

@router.patch("/me", response_model=UserOut)
async def update_user_me(
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """Update current user profile name, language, or fcm_token."""
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.preferred_language is not None:
        current_user.preferred_language = user_update.preferred_language
    if user_update.fcm_token is not None:
        current_user.fcm_token = user_update.fcm_token
        
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user

@router.post("/refresh", response_model=TokenOut)
@limiter.limit("10/minute")
async def refresh_token(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> Any:
    """Refresh JWT token for current user."""
    access_token = create_access_token(
        subject=str(current_user.id),
        extra_claims={"role": current_user.role, "email": current_user.email},
    )
    return {"access_token": access_token, "token_type": "bearer"}
