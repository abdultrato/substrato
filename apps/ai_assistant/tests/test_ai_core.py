"""Comprehensive tests for AI assistant module."""

import time
from unittest.mock import MagicMock, patch

import pytest
from django.test import TestCase

from apps.ai_assistant.services.cache import (
    AiCacheManager,
    MemoryCacheBackend,
    RedisCacheBackend,
)
from apps.ai_assistant.services.rate_limiter import (
    RateLimitConfig,
    RateLimitExceeded,
    RateLimitStrategy,
    SlidingWindowBackend,
    TokenBucketBackend,
    rate_limiter,
)


class TestMemoryCacheBackend(TestCase):
    """Tests for memory cache backend."""

    def setUp(self) -> None:
        self.backend = MemoryCacheBackend(max_size=3)

    def test_set_and_get(self) -> None:
        """Test basic set/get operations."""
        self.backend.set("key1", "value1")
        self.assertEqual(self.backend.get("key1"), "value1")

    def test_get_missing_key(self) -> None:
        """Test getting missing key returns None."""
        self.assertIsNone(self.backend.get("missing"))

    def test_delete(self) -> None:
        """Test delete operation."""
        self.backend.set("key1", "value1")
        self.assertTrue(self.backend.delete("key1"))
        self.assertIsNone(self.backend.get("key1"))

    def test_delete_missing_key(self) -> None:
        """Test deleting missing key."""
        self.assertFalse(self.backend.delete("missing"))

    def test_clear(self) -> None:
        """Test clear operation."""
        self.backend.set("key1", "value1")
        self.backend.set("key2", "value2")
        self.assertTrue(self.backend.clear())
        self.assertIsNone(self.backend.get("key1"))
        self.assertIsNone(self.backend.get("key2"))

    def test_fifo_eviction(self) -> None:
        """Test FIFO eviction when max_size exceeded."""
        self.backend.set("key1", "value1")
        self.backend.set("key2", "value2")
        self.backend.set("key3", "value3")
        self.assertEqual(len(self.backend._cache), 3)

        # Adding 4th item should evict first
        self.backend.set("key4", "value4")
        self.assertIsNone(self.backend.get("key1"))
        self.assertIsNotNone(self.backend.get("key4"))

    def test_hit_miss_stats(self) -> None:
        """Test hit/miss statistics."""
        self.backend.set("key1", "value1")

        # Hit
        self.backend.get("key1")
        # Miss
        self.backend.get("missing")

        stats = self.backend.get_stats()
        self.assertEqual(stats["hits"], 1)
        self.assertEqual(stats["misses"], 1)
        self.assertIn("50.0%", stats["hit_rate"])


class TestRedisCacheBackend(TestCase):
    """Tests for Redis cache backend with fallback."""

    def setUp(self) -> None:
        self.config = RateLimitConfig()
        self.backend = RedisCacheBackend()

    def test_fallback_to_memory(self) -> None:
        """Test fallback to memory when Redis unavailable."""
        if not self.backend._available:
            self.backend.set("key1", "value1")
            self.assertEqual(self.backend.get("key1"), "value1")
            self.assertIsNotNone(self.backend._fallback)


class TestSlidingWindowBackend(TestCase):
    """Tests for sliding window rate limiting."""

    def setUp(self) -> None:
        self.config = RateLimitConfig(
            strategy=RateLimitStrategy.SLIDING_WINDOW,
            limit=3,
            window_seconds=2,
        )
        self.backend = SlidingWindowBackend(self.config)

    def test_allow_within_limit(self) -> None:
        """Test allowing requests within limit."""
        self.assertTrue(self.backend.is_allowed("user:1"))
        self.assertTrue(self.backend.is_allowed("user:1"))
        self.assertTrue(self.backend.is_allowed("user:1"))

    def test_deny_over_limit(self) -> None:
        """Test denying requests over limit."""
        self.assertTrue(self.backend.is_allowed("user:1"))
        self.assertTrue(self.backend.is_allowed("user:1"))
        self.assertTrue(self.backend.is_allowed("user:1"))
        self.assertFalse(self.backend.is_allowed("user:1"))

    def test_window_expiry(self) -> None:
        """Test that old requests expire from window."""
        self.assertTrue(self.backend.is_allowed("user:1"))
        self.assertTrue(self.backend.is_allowed("user:1"))
        self.assertTrue(self.backend.is_allowed("user:1"))

        # Sleep to let window expire
        time.sleep(2.1)

        # Should be allowed again
        self.assertTrue(self.backend.is_allowed("user:1"))

    def test_get_usage(self) -> None:
        """Test getting usage stats."""
        self.backend.is_allowed("user:1")
        self.backend.is_allowed("user:1")

        usage = self.backend.get_usage("user:1")
        self.assertEqual(usage["requests"], 2)
        self.assertEqual(usage["limit"], 3)

    def test_reset(self) -> None:
        """Test resetting limit."""
        self.backend.is_allowed("user:1")
        self.backend.is_allowed("user:1")

        self.assertTrue(self.backend.reset("user:1"))
        self.assertEqual(self.backend.get_usage("user:1")["requests"], 0)


class TestTokenBucketBackend(TestCase):
    """Tests for token bucket rate limiting."""

    def setUp(self) -> None:
        self.config = RateLimitConfig(
            strategy=RateLimitStrategy.TOKEN_BUCKET,
            limit=3,
            window_seconds=1,
        )
        self.backend = TokenBucketBackend(self.config)

    def test_allow_within_tokens(self) -> None:
        """Test allowing requests with available tokens."""
        self.assertTrue(self.backend.is_allowed("user:1"))
        self.assertTrue(self.backend.is_allowed("user:1"))
        self.assertTrue(self.backend.is_allowed("user:1"))

    def test_deny_no_tokens(self) -> None:
        """Test denying requests without tokens."""
        self.backend.is_allowed("user:1")
        self.backend.is_allowed("user:1")
        self.backend.is_allowed("user:1")
        self.assertFalse(self.backend.is_allowed("user:1"))

    def test_token_refill(self) -> None:
        """Test that tokens refill over time."""
        self.backend.is_allowed("user:1")
        self.backend.is_allowed("user:1")
        self.backend.is_allowed("user:1")
        self.assertFalse(self.backend.is_allowed("user:1"))

        # Wait for refill
        time.sleep(1.1)

        # Should have tokens now
        self.assertTrue(self.backend.is_allowed("user:1"))

    def test_reset(self) -> None:
        """Test resetting token bucket."""
        self.backend.is_allowed("user:1")
        self.backend.is_allowed("user:1")

        self.assertTrue(self.backend.reset("user:1"))
        usage = self.backend.get_usage("user:1")
        # After reset, tokens should be back to full
        self.assertIn("tokens", usage)


class TestAiRateLimiter(TestCase):
    """Tests for main rate limiter."""

    def setUp(self) -> None:
        self.limiter = rate_limiter

    def test_is_allowed(self) -> None:
        """Test is_allowed check."""
        # Default config has high limit
        self.assertTrue(self.limiter.is_allowed("user:1"))

    def test_check_limit_raises(self) -> None:
        """Test check_limit raises RateLimitExceeded."""
        config = RateLimitConfig(limit=1, window_seconds=1)

        # Use unique key to avoid state from other tests
        unique_key = f"test_check_limit_raises_{id(config)}"

        # First request should pass
        self.limiter.check_limit(unique_key, config=config)

        # Second should raise
        with self.assertRaises(RateLimitExceeded) as ctx:
            self.limiter.check_limit(unique_key, config=config)

        self.assertEqual(ctx.exception.limit, 1)
        self.assertEqual(ctx.exception.window, 1)

    def test_get_usage(self) -> None:
        """Test getting usage stats."""
        usage = self.limiter.get_usage("user:test")
        self.assertIn("requests", usage)
        self.assertIn("limit", usage)

    def test_reset(self) -> None:
        """Test reset operation."""
        self.assertTrue(self.limiter.reset("user:1"))


class TestAiCacheManager(TestCase):
    """Tests for cache manager singleton."""

    def tearDown(self) -> None:
        AiCacheManager.reset()

    def test_singleton(self) -> None:
        """Test cache manager is singleton."""
        manager1 = AiCacheManager()
        manager2 = AiCacheManager()
        self.assertIs(manager1, manager2)

    def test_set_get(self) -> None:
        """Test basic cache operations."""
        manager = AiCacheManager()
        manager.set("key1", "value1")
        self.assertEqual(manager.get("key1"), "value1")

    def test_delete(self) -> None:
        """Test cache delete."""
        manager = AiCacheManager()
        manager.set("key1", "value1")
        self.assertTrue(manager.delete("key1"))
        self.assertIsNone(manager.get("key1"))

    def test_clear(self) -> None:
        """Test cache clear."""
        manager = AiCacheManager()
        manager.set("key1", "value1")
        manager.set("key2", "value2")
        self.assertTrue(manager.clear())

    def test_stats(self) -> None:
        """Test getting cache stats."""
        manager = AiCacheManager()
        stats = manager.get_stats()
        self.assertIn("backend", stats)


class TestRateLimitDecorator(TestCase):
    """Tests for rate limit decorators."""

    def test_sync_decorator(self) -> None:
        """Test synchronous rate limit decorator."""
        from apps.ai_assistant.services.rate_limiter import rate_limit

        config = RateLimitConfig(limit=2, window_seconds=1)

        # Use unique key to avoid state from other tests
        unique_key = f"test_sync_decorator_{id(config)}"

        @rate_limit(lambda *args: unique_key, config=config)
        def test_func():
            return "success"

        # First two calls should work
        self.assertEqual(test_func(), "success")
        self.assertEqual(test_func(), "success")

        # Third should raise
        with self.assertRaises(RateLimitExceeded):
            test_func()

    # Note: Async tests require pytest-asyncio plugin
    # Commenting out for now - can be uncommented when pytest-asyncio is installed
    # @pytest.mark.asyncio
    # async def test_async_decorator(self) -> None:
    #     """Test asynchronous rate limit decorator."""
    #     from apps.ai_assistant.services.rate_limiter import rate_limit_async
    #
    #     config = RateLimitConfig(limit=2, window_seconds=1)
    #
    #     @rate_limit_async(lambda *args: "test_key", config=config)
    #     async def test_func():
    #         return "success"
    #
    #     # First two calls should work
    #     self.assertEqual(await test_func(), "success")
    #     self.assertEqual(await test_func(), "success")
    #
    #     # Third should raise
    #     with self.assertRaises(RateLimitExceeded):
    #         await test_func()


class TestCacheIntegration(TestCase):
    """Integration tests for cache system."""

    def test_cache_key_generation(self) -> None:
        """Test deterministic cache key generation."""
        from apps.ai_assistant.services.llm_gateway import LocalLlmGateway

        gateway = LocalLlmGateway()

        key1 = gateway._get_cache_key(
            question="test",
            language="pt",
            tool_results=[],
            blocked_tools=None,
        )

        key2 = gateway._get_cache_key(
            question="test",
            language="pt",
            tool_results=[],
            blocked_tools=None,
        )

        # Same input should produce same key
        self.assertEqual(key1, key2)

        # Different input should produce different key
        key3 = gateway._get_cache_key(
            question="different",
            language="pt",
            tool_results=[],
            blocked_tools=None,
        )

        self.assertNotEqual(key1, key3)

    def test_cache_persistence(self) -> None:
        """Test cache persists across gateway calls."""
        from apps.ai_assistant.services.llm_gateway import LocalLlmGateway

        AiCacheManager.reset()
        gateway = LocalLlmGateway()

        key = gateway._get_cache_key("test", "pt", [], None)
        gateway._save_to_cache(key, "cached_value")

        retrieved = gateway._get_from_cache(key)
        self.assertEqual(retrieved, "cached_value")


class TestRateLimitMiddleware(TestCase):
    """Tests for rate limit middleware."""

    def test_middleware_path_detection(self) -> None:
        """Test middleware detects AI endpoints."""
        from apps.ai_assistant.middleware import AiRateLimitMiddleware

        middleware = AiRateLimitMiddleware(lambda x: x)

        self.assertTrue(middleware._is_ai_endpoint("/api/v1/ai/chat"))
        self.assertTrue(middleware._is_ai_endpoint("/api/ai/chat"))
        self.assertFalse(middleware._is_ai_endpoint("/api/users/"))

    def test_middleware_operation_detection(self) -> None:
        """Test middleware detects operation type."""
        from apps.ai_assistant.middleware import AiRateLimitMiddleware

        middleware = AiRateLimitMiddleware(lambda x: x)

        self.assertEqual(middleware._get_operation("/api/ai/tool/execute"), "tool")
        self.assertEqual(middleware._get_operation("/api/ai/chat"), "chat")
