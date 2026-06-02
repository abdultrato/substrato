"""Rate limiting for AI operations to prevent abuse."""

from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from functools import wraps
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class RateLimitExceeded(Exception):
    """Raised when rate limit is exceeded."""

    def __init__(
        self,
        message: str,
        limit: int,
        window: int,
        retry_after: int | None = None,
    ):
        self.message = message
        self.limit = limit
        self.window = window
        self.retry_after = retry_after
        super().__init__(message)


class RateLimitStrategy(str, Enum):
    """Rate limiting strategies."""

    SLIDING_WINDOW = "sliding_window"  # More precise, slightly more memory
    TOKEN_BUCKET = "token_bucket"  # Classic rate limiting
    FIXED_WINDOW = "fixed_window"  # Simple but can have edge cases


@dataclass(frozen=True)
class RateLimitConfig:
    """Rate limiting configuration."""

    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    limit: int = 100  # requests
    window_seconds: int = 3600  # 1 hour
    cleanup_interval: int = 86400  # 24 hours


class RateLimitBackend(ABC):
    """Abstract rate limit backend."""

    @abstractmethod
    def is_allowed(self, key: str) -> bool:
        """Check if request is allowed."""
        pass

    @abstractmethod
    def get_usage(self, key: str) -> dict[str, Any]:
        """Get usage stats for key."""
        pass

    @abstractmethod
    def reset(self, key: str) -> bool:
        """Reset limit for key."""
        pass


class SlidingWindowBackend(RateLimitBackend):
    """Sliding window rate limiting backend."""

    def __init__(self, config: RateLimitConfig) -> None:
        self.config = config
        self._windows: dict[str, list[float]] = {}
        self._cleanup_at = time.time() + config.cleanup_interval

    def is_allowed(self, key: str) -> bool:
        """Check using sliding window."""
        now = time.time()
        self._cleanup_old_entries()

        if key not in self._windows:
            self._windows[key] = [now]
            return True

        window_start = now - self.config.window_seconds

        # Remove entries outside the sliding window
        self._windows[key] = [ts for ts in self._windows[key] if ts > window_start]

        if len(self._windows[key]) < self.config.limit:
            self._windows[key].append(now)
            return True

        return False

    def get_usage(self, key: str) -> dict[str, Any]:
        """Get sliding window usage."""
        now = time.time()
        window_start = now - self.config.window_seconds

        if key not in self._windows:
            return {"requests": 0, "limit": self.config.limit, "percentage": 0}

        active_requests = len([ts for ts in self._windows[key] if ts > window_start])
        percentage = (active_requests / self.config.limit * 100) if self.config.limit > 0 else 0

        return {
            "requests": active_requests,
            "limit": self.config.limit,
            "percentage": f"{percentage:.1f}%",
            "window_seconds": self.config.window_seconds,
        }

    def reset(self, key: str) -> bool:
        """Reset sliding window."""
        if key in self._windows:
            del self._windows[key]
        return True

    def _cleanup_old_entries(self) -> None:
        """Remove keys with no recent activity."""
        now = time.time()
        if now < self._cleanup_at:
            return

        window_start = now - self.config.window_seconds
        keys_to_delete = []

        for key, timestamps in self._windows.items():
            active = [ts for ts in timestamps if ts > window_start]
            if not active:
                keys_to_delete.append(key)

        for key in keys_to_delete:
            del self._windows[key]

        self._cleanup_at = now + self.config.cleanup_interval
        logger.debug(f"Rate limiter cleanup: removed {len(keys_to_delete)} inactive keys")


class TokenBucketBackend(RateLimitBackend):
    """Token bucket rate limiting backend."""

    def __init__(self, config: RateLimitConfig) -> None:
        self.config = config
        self._buckets: dict[str, dict[str, float]] = {}

    def is_allowed(self, key: str) -> bool:
        """Check using token bucket."""
        now = time.time()

        if key not in self._buckets:
            self._buckets[key] = {"tokens": self.config.limit, "last_refill": now}

        bucket = self._buckets[key]
        time_passed = now - bucket["last_refill"]

        # Calculate token refill rate
        refill_rate = self.config.limit / self.config.window_seconds
        tokens_to_add = time_passed * refill_rate
        bucket["tokens"] = min(self.config.limit, bucket["tokens"] + tokens_to_add)
        bucket["last_refill"] = now

        if bucket["tokens"] >= 1:
            bucket["tokens"] -= 1
            return True

        return False

    def get_usage(self, key: str) -> dict[str, Any]:
        """Get token bucket usage."""
        now = time.time()

        if key not in self._buckets:
            return {"tokens": self.config.limit, "limit": self.config.limit, "percentage": 0}

        bucket = self._buckets[key]
        percentage = (bucket["tokens"] / self.config.limit * 100) if self.config.limit > 0 else 0

        return {
            "tokens": f"{bucket['tokens']:.2f}",
            "limit": self.config.limit,
            "percentage": f"{percentage:.1f}%",
            "refill_rate": f"{self.config.limit / self.config.window_seconds:.4f} tokens/sec",
        }

    def reset(self, key: str) -> bool:
        """Reset token bucket."""
        if key in self._buckets:
            del self._buckets[key]
        return True


class AiRateLimiter:
    """Rate limiter for AI operations."""

    def __init__(self, default_config: Optional[RateLimitConfig] = None) -> None:
        self.default_config = default_config or RateLimitConfig()
        self._backend: RateLimitBackend | None = None
        self._setup_backend()

    def _setup_backend(self) -> None:
        """Setup rate limit backend based on strategy."""
        if self.default_config.strategy == RateLimitStrategy.TOKEN_BUCKET:
            self._backend = TokenBucketBackend(self.default_config)
        else:
            self._backend = SlidingWindowBackend(self.default_config)

    def is_allowed(
        self,
        key: str,
        *,
        config: Optional[RateLimitConfig] = None,
    ) -> bool:
        """Check if operation is allowed."""
        cfg = config or self.default_config
        try:
            return self._backend.is_allowed(key)
        except Exception as e:
            logger.error(f"Rate limiter error for key {key}: {e}")
            # On error, allow the request (fail open)
            return True

    def check_limit(
        self,
        key: str,
        *,
        config: Optional[RateLimitConfig] = None,
    ) -> None:
        """Check limit and raise if exceeded."""
        cfg = config or self.default_config

        if not self.is_allowed(key, config=cfg):
            logger.warning(f"Rate limit exceeded for key: {key}")
            raise RateLimitExceeded(
                f"Rate limit exceeded: {cfg.limit} requests per {cfg.window_seconds}s",
                limit=cfg.limit,
                window=cfg.window_seconds,
            )

    def get_usage(self, key: str) -> dict[str, Any]:
        """Get usage stats for key."""
        try:
            return self._backend.get_usage(key)
        except Exception as e:
            logger.error(f"Error getting rate limit usage for {key}: {e}")
            return {"error": str(e)}

    def reset(self, key: str) -> bool:
        """Reset limit for key."""
        try:
            return self._backend.reset(key)
        except Exception as e:
            logger.error(f"Error resetting rate limit for {key}: {e}")
            return False


# Singleton instance with default config
rate_limiter = AiRateLimiter()


def rate_limit(
    key_func: Callable[[Any], str],
    config: Optional[RateLimitConfig] = None,
) -> Callable:
    """Decorator for rate limiting functions/methods.

    Args:
        key_func: Function that extracts the rate limit key from args/kwargs
        config: Optional RateLimitConfig (uses default if None)

    Example:
        @rate_limit(key_func=lambda self, user, *args: f"user:{user.id}")
        def chat_with_ai(self, user, message):
            pass
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            key = key_func(*args, **kwargs)
            rate_limiter.check_limit(key, config=config)
            return func(*args, **kwargs)

        return wrapper

    return decorator


def rate_limit_async(
    key_func: Callable[[Any], str],
    config: Optional[RateLimitConfig] = None,
) -> Callable:
    """Async decorator for rate limiting async functions/methods."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            key = key_func(*args, **kwargs)
            rate_limiter.check_limit(key, config=config)
            return await func(*args, **kwargs)

        return wrapper

    return decorator
