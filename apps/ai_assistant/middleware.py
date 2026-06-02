"""Rate limiting middleware for AI endpoints."""

from __future__ import annotations

import logging
from typing import Callable

from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

from apps.ai_assistant.services.rate_limiter import RateLimitExceeded, RateLimitConfig, rate_limiter

logger = logging.getLogger(__name__)


class AiRateLimitMiddleware(MiddlewareMixin):
    """Middleware to apply rate limiting to AI endpoints."""

    AI_ENDPOINTS = [
        "/api/v1/ai/chat",
        "/api/ai/chat",
    ]

    # Rate limits by operation type
    LIMITS = {
        "chat": RateLimitConfig(limit=100, window_seconds=3600),  # 100 per hour
        "tool": RateLimitConfig(limit=50, window_seconds=3600),  # 50 per hour
    }

    def process_request(self, request) -> None:
        """Apply rate limiting before processing request."""
        if not self._is_ai_endpoint(request.path):
            return

        try:
            user_id = self._get_user_id(request)
            tenant_id = self._get_tenant_id(request)

            if not user_id:
                return

            # Determine operation type
            operation = self._get_operation(request.path)
            config = self.LIMITS.get(operation) or self.LIMITS["chat"]

            # Build rate limit key: tenant:user:operation
            key = f"ai_ratelimit:{tenant_id or 'default'}:{user_id}:{operation}"

            # Check rate limit
            rate_limiter.check_limit(key, config=config)

        except RateLimitExceeded as e:
            logger.warning(f"Rate limit exceeded: {e.message} for {request.path}")
        except Exception as e:
            logger.error(f"Error in rate limit middleware: {e}")
            # Continue on error (fail open)

    def process_response(self, request, response):
        """Add rate limit info to response headers."""
        if not self._is_ai_endpoint(request.path):
            return response

        try:
            user_id = self._get_user_id(request)
            if not user_id:
                return response

            operation = self._get_operation(request.path)
            tenant_id = self._get_tenant_id(request)
            key = f"ai_ratelimit:{tenant_id or 'default'}:{user_id}:{operation}"

            usage = rate_limiter.get_usage(key)
            if usage and "requests" in usage:
                response["X-RateLimit-Limit"] = str(usage.get("limit", "?"))
                response["X-RateLimit-Remaining"] = str(usage.get("requests", "?"))
                response["X-RateLimit-Percentage"] = str(usage.get("percentage", "?"))

        except Exception as e:
            logger.debug(f"Error adding rate limit headers: {e}")

        return response

    @staticmethod
    def _is_ai_endpoint(path: str) -> bool:
        """Check if path is an AI endpoint."""
        return any(path.startswith(endpoint) for endpoint in AiRateLimitMiddleware.AI_ENDPOINTS)

    @staticmethod
    def _get_user_id(request) -> str | None:
        """Extract user ID from request."""
        if hasattr(request, "user") and request.user.is_authenticated:
            return str(request.user.id)
        return None

    @staticmethod
    def _get_tenant_id(request) -> str | None:
        """Extract tenant ID from request."""
        # Try different ways to get tenant
        if hasattr(request, "tenant") and request.tenant:
            return str(request.tenant.id)

        # From query params
        if "tenant" in request.GET:
            return request.GET["tenant"]

        # From header
        if "X-Tenant-ID" in request.headers:
            return request.headers["X-Tenant-ID"]

        return None

    @staticmethod
    def _get_operation(path: str) -> str:
        """Determine operation type from path."""
        if "tool" in path:
            return "tool"
        return "chat"
