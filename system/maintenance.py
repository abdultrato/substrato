from django.core.cache import cache

CACHE_KEY = "system:maintenance_mode"


def ativar():
    cache.set(CACHE_KEY, True, None)


def desativar():
    cache.delete(CACHE_KEY)


def esta_ativo() -> bool:
    return bool(cache.get(CACHE_KEY, False))
