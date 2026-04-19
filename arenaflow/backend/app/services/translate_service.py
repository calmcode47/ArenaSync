import asyncio
import logging

from fastapi import HTTPException
from google.cloud import translate_v2 as translate

from app.core.config import settings

logger = logging.getLogger(__name__)

SUPPORTED_LANGS = ["es", "hi", "fr", "de", "pt", "ar", "zh"]


class TranslateService:
    def __init__(self):
        try:
            self.client = translate.Client(api_key=settings.GOOGLE_TRANSLATE_API_KEY)
        except Exception as e:
            logger.error(f"Failed to initialize Google Translate client: {e}")
            self.client = None

    async def translate_text(
        self, text: str, target_lang: str, source_lang: str = "en"
    ) -> str:
        if not self.client:
            logger.warning("Translation service unavailable, returning original text")
            return text

        try:
            result = await asyncio.to_thread(
                self.client.translate,
                text,
                target_language=target_lang,
                source_language=source_lang,
            )
            return result["translatedText"]
        except Exception as e:
            logger.error(f"Translation API error: {e}")
            return text

    async def translate_alert(self, title: str, message: str) -> dict:
        results = {}

        async def trans_task(lang: str):
            t_title = await self.translate_text(title, lang)
            t_msg = await self.translate_text(message, lang)
            return lang, {"title": t_title, "message": t_msg}

        try:
            tasks = [trans_task(lang) for lang in SUPPORTED_LANGS]
            completed = await asyncio.gather(*tasks, return_exceptions=True)

            for index, res in enumerate(completed):
                if isinstance(res, Exception):
                    logger.error(
                        f"Failed translation for lang {SUPPORTED_LANGS[index]}: {res}"
                    )
                else:
                    lang, trans_data = res
                    results[lang] = trans_data

            return results
        except Exception as e:
            logger.error(f"Batch translation failed: {e}")
            return {}
