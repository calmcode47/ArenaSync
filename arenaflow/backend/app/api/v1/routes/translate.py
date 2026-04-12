from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, List
from uuid import UUID
from pydantic import BaseModel

from app.core.dependencies import get_db, limiter
from app.models.alert import Alert
from app.services.translate_service import TranslateService, SUPPORTED_LANGS

router = APIRouter()
translate_service = TranslateService()

class TranslateTextRequest(BaseModel):
    text: str
    target_lang: str
    source_lang: str = "en"

class TranslateTextResponse(BaseModel):
    original: str
    translated: str
    target_lang: str

@router.post("/text", response_model=TranslateTextResponse)
@limiter.limit("20/minute")
async def translate_text(
    request: Request,
    req_data: TranslateTextRequest
) -> Any:
    """Translate arbitrary string text to a target language."""
    if req_data.target_lang not in SUPPORTED_LANGS:
        raise HTTPException(status_code=400, detail=f"Unsupported language. Supported: {SUPPORTED_LANGS}")
        
    translated = await translate_service.translate_text(
        req_data.text, 
        req_data.target_lang, 
        req_data.source_lang
    )
    return {
        "original": req_data.text,
        "translated": translated,
        "target_lang": req_data.target_lang
    }

@router.post("/alert/{id}")
async def retranslate_alert(
    id: UUID,
    target_lang: str,
    db: AsyncSession = Depends(get_db)
) -> Any:
    """Retranslate an existing alert into a new language and continuously update the record."""
    alert = await db.get(Alert, id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    if target_lang not in SUPPORTED_LANGS:
        raise HTTPException(status_code=400, detail="Unsupported language")
        
    t_title = await translate_service.translate_text(alert.title, target_lang)
    t_msg = await translate_service.translate_text(alert.message, target_lang)
    
    dict_copy = dict(alert.translated_messages) if alert.translated_messages else {}
    dict_copy[target_lang] = {"title": t_title, "message": t_msg}
    alert.translated_messages = dict_copy
    
    await db.commit()
    await db.refresh(alert)
    return alert

@router.get("/languages", response_model=List[str])
async def list_languages() -> Any:
    """List all supported language codes for translation."""
    return SUPPORTED_LANGS
