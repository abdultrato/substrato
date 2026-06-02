"""Cache layer for AI gateway with Redis fallback."""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class AiCacheBackend(ABC, Generic[T]):
    """Abstract cache backend interface."""

    @abstractmethod
    def get(self, key: str) -> T | None:
        """Retrieve value from cache."""
        pass

    @abstractmethod
    def set(self, key: str, value: T, ttl_seconds: int | None = None) -> bool:
        """Store value in cache with optional TTL."""
        pass

    @abstractmethod
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        pass

    @abstractmethod
    def clear(self) -> bool:
        """Clear all cache."""
        pass

    @abstractmethod
    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        pass


class MemoryCacheBackend(AiCacheBackend[str]):
    """In-memory cache backend with LRU eviction."""

    def __init__(self, max_size: int = 500) -> None:
        self._cache: dict[str, str] = {}
        self._max_size = max_size
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> str | None:
        """Retrieve from memory cache."""
        value = self._cache.get(key)
        if value is not None:
            self._hits += 1
            return value
        self._misses += 1
        return None

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        """Store in memory cache (TTL not supported in memory backend)."""
        if ttl_seconds is not None:
            logger.debug(f"Memory cache doesn't support TTL, storing {key} without expiration")

        self._cache[key] = value

        # Simple FIFO eviction when max_size exceeded
        if len(self._cache) > self._max_size:
            evicted_key = next(iter(self._cache))
            del self._cache[evicted_key]
            logger.debug(f"Memory cache evicted {evicted_key} (max_size={self._max_size} exceeded)")

        return True

    def delete(self, key: str) -> bool:
        """Delete from memory cache."""
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def clear(self) -> bool:
        """Clear all memory cache."""
        self._cache.clear()
        return True

    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        total_requests = self._hits + self._misses
        hit_rate = (self._hits / total_requests * 100) if total_requests > 0 else 0
        return {
            "backend": "memory",
            "size": len(self._cache),
            "max_size": self._max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{hit_rate:.1f}%",
            "total_requests": total_requests,
        }


class RedisCacheBackend(AiCacheBackend[str]):
    """Redis cache backend with automatic fallback."""

    def __init__(self, default_ttl_seconds: int = 3600) -> None:
        self._client = None
        self._available = False
        self._fallback: MemoryCacheBackend | None = None
        self._default_ttl = default_ttl_seconds
        self._stats = {"fallbacks": 0, "redis_errors": 0}
        self._init_client()

    def _init_client(self) -> None:
        """Initialize Redis client with fallback."""
        try:
            import django
            from django.core.cache import cache

            if hasattr(cache, "client"):
                self._client = cache.client
                self._available = True
                logger.info("Redis cache backend initialized successfully")
            else:
                logger.warning("Django cache is not Redis, will use memory fallback")
                self._setup_fallback()
        except Exception as e:
            logger.warning(f"Failed to initialize Redis cache: {e}. Using memory fallback.")
            self._setup_fallback()

    def _setup_fallback(self) -> None:
        """Setup memory fallback."""
        self._fallback = MemoryCacheBackend(max_size=500)
        self._available = False

    def get(self, key: str) -> str | None:
        """Retrieve from Redis or fallback."""
        if not self._available:
            return self._fallback.get(key) if self._fallback else None

        try:
            value = self._client.get(key)
            if isinstance(value, bytes):
                return value.decode("utf-8")
            return value
        except Exception as e:
            logger.error(f"Redis GET error for key {key}: {e}")
            self._stats["redis_errors"] += 1
            if self._fallback:
                self._stats["fallbacks"] += 1
                return self._fallback.get(key)
            return None

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        """Store in Redis or fallback."""
        ttl = ttl_seconds or self._default_ttl

        if not self._available:
            return self._fallback.set(key, value, ttl) if self._fallback else False

        try:
            self._client.setex(key, ttl, value)
            return True
        except Exception as e:
            logger.error(f"Redis SET error for key {key}: {e}")
            self._stats["redis_errors"] += 1
            if self._fallback:
                self._stats["fallbacks"] += 1
                return self._fallback.set(key, value, ttl)
            return False

    def delete(self, key: str) -> bool:
        """Delete from Redis or fallback."""
        if not self._available:
            return self._fallback.delete(key) if self._fallback else False

        try:
            self._client.delete(key)
            return True
        except Exception as e:
            logger.error(f"Redis DELETE error for key {key}: {e}")
            self._stats["redis_errors"] += 1
            if self._fallback:
                self._stats["fallbacks"] += 1
                return self._fallback.delete(key)
            return False

    def clear(self) -> bool:
        """Clear Redis or fallback."""
        success = True

        if self._available:
            try:
                self._client.flushdb()
            except Exception as e:
                logger.error(f"Redis FLUSHDB error: {e}")
                self._stats["redis_errors"] += 1
                success = False

        if self._fallback:
            self._fallback.clear()

        return success

    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        stats = {
            "backend": "redis_with_fallback" if self._available else "memory_fallback",
            "redis_available": self._available,
            "redis_errors": self._stats["redis_errors"],
            "fallback_activations": self._stats["fallbacks"],
        }

        if self._fallback:
            stats["memory_stats"] = self._fallback.get_stats()

        return stats


class AiCacheManager:
    """Manager for AI cache with configurable backend."""

    _instance: AiCacheManager | None = None
    _backend: AiCacheBackend[str] | None = None

    def __new__(cls) -> AiCacheManager:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return

        self._initialized = True
        self._setup_backend()

    def _setup_backend(self) -> None:
        """Setup cache backend based on Django settings."""
        try:
            from django.conf import settings

            cache_type = getattr(settings, "AI_CACHE_BACKEND", None)
            if cache_type is None:
                cache_type = "redis" if getattr(settings, "USE_REDIS", False) else "memory"

            if cache_type == "memory":
                self._backend = MemoryCacheBackend()
                logger.info("Using memory cache backend")
            else:
                self._backend = RedisCacheBackend()
                logger.info("Using Redis cache backend with memory fallback")
        except Exception as e:
            logger.error(f"Error setting up cache backend: {e}, using memory fallback")
            self._backend = MemoryCacheBackend()

    @property
    def backend(self) -> AiCacheBackend[str]:
        """Get current cache backend."""
        if self._backend is None:
            self._setup_backend()
        return self._backend

    def get(self, key: str) -> str | None:
        """Get value from cache."""
        return self.backend.get(key)

    def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        """Set value in cache."""
        return self.backend.set(key, value, ttl_seconds)

    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        return self.backend.delete(key)

    def clear(self) -> bool:
        """Clear cache."""
        return self.backend.clear()

    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics."""
        return self.backend.get_stats()

    @classmethod
    def reset(cls) -> None:
        """Reset cache manager (useful for testing)."""
        cls._instance = None
        cls._backend = None


# Singleton instance
cache_manager = AiCacheManager()
