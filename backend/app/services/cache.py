"""
DamKoi — Redis Caching Service
High-performance caching layer for sub-10ms response times.
"""

import json
from typing import Optional, Any
import redis.asyncio as redis
from app.config import settings

class CacheService:
    """Async Redis wrapper for application-wide caching."""
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.enabled = bool(settings.REDIS_URL)

    async def connect(self):
        if self.enabled and not self.redis:
            self.redis = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=1.0,
                socket_connect_timeout=1.0,
                retry_on_timeout=True
            )

    async def get(self, key: str) -> Optional[Any]:
        if not self.enabled: return None
        await self.connect()
        try:
            val = await self.redis.get(key)
            return json.loads(val) if val else None
        except Exception as e:
            print(f"[WARN] Redis GET error: {e}")
            return None

    async def set(self, key: str, value: Any, expire_seconds: int = 3600):
        if not self.enabled: return
        await self.connect()
        try:
            await self.redis.set(
                key,
                json.dumps(value),
                ex=expire_seconds
            )
        except Exception as e:
            print(f"[WARN] Redis SET error: {e}")

    async def delete(self, key: str):
        if not self.enabled: return
        await self.connect()
        try:
            await self.redis.delete(key)
        except Exception as e:
            print(f"[WARN] Redis DELETE error: {e}")

    async def invalidate_product(self, product_id: str):
        """Invalidate all cache keys related to a product."""
        if not self.enabled: return
        await self.connect()
        try:
            # Keys like: product_lookup:{url}, product_details:{id}, price_history:{id}
            # We'll use a simple pattern for now
            await self.delete(f"product_details:{product_id}")
            await self.delete(f"price_history:{product_id}")
        except Exception as e:
            print(f"[WARN] Redis Invalidation error: {e}")

# Singleton instance
cache = CacheService()
