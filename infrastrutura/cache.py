from django.core.cache import cache


def obter_chave(chave):
    return cache.get(chave)


def salvar_chave(chave, valor, timeout=300):
    cache.set(chave, valor, timeout)


from django.core.cache import cache

DEFAULT_TIMEOUT = 60 * 10  # 10 minutos


def cache_get(key):
    return cache.get(key)


def cache_set(key, value, timeout=DEFAULT_TIMEOUT):
    cache.set(key, value, timeout)


def cache_delete(key):
    cache.delete(key)


def cache_remember(key, func, timeout=DEFAULT_TIMEOUT):
    """
    Busca no cache ou executa função e armazena.
    """
    value = cache.get(key)

    if value is None:
        value = func()
        cache.set(key, value, timeout)

    return value


from django.core.cache import cache

DEFAULT_TIMEOUT = 600


def remember(key, func, timeout=DEFAULT_TIMEOUT):
    value = cache.get(key)
    if value is None:
        value = func()
        cache.set(key, value, timeout)
    return value
