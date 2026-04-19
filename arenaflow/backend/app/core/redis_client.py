import logging
from typing import Any, Optional

import orjson
from upstash_redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

redis = None
if getattr(settings, "UPSTASH_REDIS_REST_URL", None):
    redis = Redis(
        url=settings.UPSTASH_REDIS_REST_URL, token=settings.UPSTASH_REDIS_REST_TOKEN
    )
else:
    logger.warning("Redis not configured — caching disabled")


async def get_cached(key: str) -> Optional[Any]:
    if not redis:
        return None
    try:
        data = await redis.get(key)
        if not data:
            return None
        return orjson.loads(data)
    except Exception as e:
        logger.warning(f"Redis GET failed for {key}: {e}")
        return None


async def set_cached(key: str, value: Any, ttl_seconds: int = 300) -> None:
    if not redis:
        return
    try:
        serialized = orjson.dumps(value).decode("utf-8")
        await redis.set(key, serialized, ex=ttl_seconds)
    except Exception as e:
        logger.warning(f"Redis SET failed for {key}: {e}")


async def invalidate(key: str) -> None:
    if not redis:
        return
    try:
        await redis.delete(key)
    except Exception as e:
        logger.warning(f"Redis DELETE failed for {key}: {e}")


async def publish_event(channel: str, payload: dict) -> None:
    if not redis:
        return
    try:
        serialized = orjson.dumps(payload).decode("utf-8")
        await redis.publish(channel, serialized)
    except Exception as e:
        logger.warning(f"Redis PUBLISH failed on {channel}: {e}")
