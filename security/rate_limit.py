import time

from django.core.cache import cache


def permitido(key: str, limite=5, intervalo=60):

    agora = time.time()
    registros = cache.get(key, [])

    registros = [t for t in registros if agora - t < intervalo]

    if len(registros) >= limite:
        return False

    registros.append(agora)

    cache.set(key, registros, timeout=intervalo)

    return True
