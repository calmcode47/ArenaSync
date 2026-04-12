import orjson
from upstash_redis.asyncio import Redis
from app.core.config import settings
from typing import Any, Optional

redis = Redis(url=settings.UPSTASH_REDIS_REST_URL, token=settings.UPSTASH_REDIS_REST_TOKEN)

async def get_cached(key: str) -> Optional[Any]:
    data = await redis.get(key)
    if not data:
        return None
    try:
        return orjson.loads(data)
    except (orjson.JSONDecodeError, TypeError):
        return data

async def set_cached(key: str, value: Any, ttl_seconds: int = 300) -> None:
    serialized = orjson.dumps(value).decode("utf-8")
    await redis.set(key, serialized, ex=ttl_seconds)

async def invalidate(key: str) -> None:
    await redis.delete(key)

async def publish_event(channel: str, payload: dict) -> None:
    serialized = orjson.dumps(payload).decode("utf-8")
    await redis.publish(channel, serialized)
