import time
from django.core.cache import cache


def permitido(chave: str, limite=5, intervalo=60):

    agora = time.time()
    registros = cache.get(chave, [])

    registros = [t for t in registros if agora - t < intervalo]

    if len(registros) >= limite:
        return False

    registros.append(agora)

    cache.set(chave, registros, timeout=intervalo)

    return True
