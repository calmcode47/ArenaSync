from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, List
from uuid import UUID

from app.core.dependencies import get_db, get_current_user, limiter
from app.models.user import User
from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertOut, AlertUpdate
from app.services.alert_service import AlertService

router = APIRouter()

def require_staff(user: User = Depends(get_current_user)):
    if user.role not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user

def require_admin(user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin permissions required")
    return user

@router.post("/create", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_in: AlertCreate,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Create a new alert. Auto-translates and sends FCM if severity is high or critical."""
    service = AlertService(db)
    return await service.create_alert(alert_in, created_by=current_user.id)

@router.get("/venue/{venue_id}", response_model=List[AlertOut])
@limiter.limit("60/minute")
async def get_active_alerts(
    request: Request,
    venue_id: UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get all active, unresolved alerts for a specific venue."""
    service = AlertService(db)
    return await service.get_active_alerts(venue_id)

@router.patch("/{alert_id}/resolve", response_model=AlertOut)
async def resolve_alert(
    alert_id: UUID,
    current_user: User = Depends(require_staff),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Mark an active alert as resolved."""
    service = AlertService(db)
    return await service.resolve_alert(alert_id)

@router.get("/{alert_id}", response_model=AlertOut)
async def get_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Get details of a specific alert by ID."""
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Delete an alert completely from the system (Admin only)."""
    alert = await db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    await db.delete(alert)
    await db.commit()
    return None
