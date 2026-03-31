"""Helpers de cache/locking base para o core."""

from hashlib import md5

from django.core.cache import cache
from django_redis import get_redis_connection as grc

DEFAULT_TIMEOUT = 60 * 10
CACHE_PREFIX = "app"


# =========================================================
# KEY BUILDER
# =========================================================


def make_key(key: str, *, namespace="default", tenant=None, version=1):
    base = f"{CACHE_PREFIX}:{namespace}:v{version}:{tenant or 'global'}:{key}"
    return md5(base.encode()).hexdigest()


# =========================================================
# BASIC OPERATIONS
# =========================================================


def cache_get(key, **kwargs):
    return cache.get(make_key(key, **kwargs))


def cache_set(key, value, timeout=DEFAULT_TIMEOUT, **kwargs):
    cache.set(make_key(key, **kwargs), value, timeout)


def cache_delete(key, **kwargs):
    cache.delete(make_key(key, **kwargs))


# =========================================================
# CACHE REMEMBER (ANTI-STAMPEDE)
# =========================================================


def cache_remember(key, func, timeout=DEFAULT_TIMEOUT, lock_timeout=10, **kwargs):
    cache_key = make_key(key, **kwargs)

    value = cache.get(cache_key)
    if value is not None:
        return value

    redis_conn = grc("default")
    lock = redis_conn.lock(f"lock:{cache_key}", timeout=lock_timeout)

    with lock:
        value = cache.get(cache_key)
        if value is not None:
            return value

        value = func()
        cache.set(cache_key, value, timeout)
        return value


# =========================================================
# CACHE TAGS (INVALIDAÇÃO POR GRUPO)
# =========================================================


def cache_set_with_tags(key, value, tags, timeout=DEFAULT_TIMEOUT, **kwargs):
    cache_key = make_key(key, **kwargs)
    cache.set(cache_key, value, timeout)

    redis_conn = grc("default")
    for tag in tags:
        redis_conn.sadd(f"tag:{tag}", cache_key)


def cache_invalidate_tag(tag):
    redis_conn = grc("default")
    keys = redis_conn.smembers(f"tag:{tag}")

    if keys:
        cache.delete_many(keys)
        redis_conn.delete(f"tag:{tag}")


# =========================================================
# METRICS (HIT / MISS)
# =========================================================


def cache_stats():
    redis_conn = grc("default")
    info = redis_conn.info()

    return {
        "used_memory_mb": round(info["used_memory"] / 1024 / 1024, 2),
        "connected_clients": info["connected_clients"],
        "hits": info["keyspace_hits"],
        "misses": info["keyspace_misses"],
        "uptime_seconds": info["uptime_in_seconds"],
    }
