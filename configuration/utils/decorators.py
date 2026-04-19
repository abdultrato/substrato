"""Decorators utilitários (cache_response)."""

from functools import wraps

from django.core.cache import cache
from rest_framework.response import Response


def cache_response(key, timeout=60):
    """
    Cacheia respostas de endpoints.

    Uso:

    @cache_response("dashboard", 120)
    def get(self, request):
        ...
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cached = cache.get(key)
            if cached:
                return Response(cached)

            response = func(*args, **kwargs)

            if hasattr(response, "data"):
                cache.set(key, response.data, timeout)

            return response

        return wrapper

    return decorator
