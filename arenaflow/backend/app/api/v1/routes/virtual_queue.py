from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.core.dependencies import get_current_user, limiter, require_role
from app.schemas.virtual_queue import JoinVirtualQueueRequest, VirtualQueueEntryOut, VirtualQueueStatusOut, CallNextOut, VirtualQueueSummaryOut, CallNextRequest
from app.services.virtual_queue_service import VirtualQueueService

router = APIRouter()
service = VirtualQueueService()

@router.post("/join", response_model=VirtualQueueEntryOut)
@limiter.limit("5/minute")
async def join_queue(
    request: Request,
    data: JoinVirtualQueueRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        user_id = UUID(current_user["uid"]) if isinstance(current_user["uid"], str) else current_user["uid"]
        return await service.join_queue(db, user_id, data)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

@router.get("/status/{ticket_code}", response_model=VirtualQueueStatusOut)
@limiter.limit("30/minute")
async def get_status(
    request: Request,
    ticket_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        return await service.get_queue_status(db, ticket_code)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/call-next", response_model=CallNextOut)
@limiter.limit("60/minute")
async def call_next(
    request: Request,
    data: CallNextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "staff"]))
):
    try:
        return await service.call_next(db, data.zone_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/complete/{ticket_code}", response_model=VirtualQueueEntryOut)
@limiter.limit("60/minute")
async def complete_entry(
    request: Request,
    ticket_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_role(["admin", "staff"]))
):
    try:
        return await service.complete_entry(db, ticket_code)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/abandon/{ticket_code}", status_code=204)
@limiter.limit("5/minute")
async def abandon_entry(
    request: Request,
    ticket_code: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    await service.abandon_entry(db, ticket_code)

@router.get("/zone/{zone_id}/summary", response_model=VirtualQueueSummaryOut)
@limiter.limit("30/minute")
async def get_summary(
    request: Request,
    zone_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    try:
        return await service.get_zone_summary(db, zone_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
