try:
    from .core_base import (
        cache_delete,
        cache_get,
        cache_invalidate_tag,
        cache_remember,
        cache_set,
        cache_set_with_tags,
        cache_stats,
        make_key,
    )
except ModuleNotFoundError:
    # Optional runtime dependency (e.g. django_redis) may be absent in local setup.
    cache_set = None
    cache_get = None
    cache_invalidate_tag = None
    cache_delete = None
    cache_stats = None
    cache_set_with_tags = None
    make_key = None
    cache_remember = None
