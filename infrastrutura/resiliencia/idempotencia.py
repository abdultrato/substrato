# infraestrutura/resiliencia/idempotencia.py

from django.core.cache import cache
from functools import wraps
from hashlib import sha256
import json


class IdempotencyError(Exception):
    pass


def gerar_chave_idempotente(prefixo: str, payload: dict) -> str:
    """
    Gera chave determinística baseada no conteúdo.
    """
    base = json.dumps(payload, sort_keys=True)
    hash_key = sha256(base.encode()).hexdigest()
    return f"idemp:{prefixo}:{hash_key}"


def idempotente(prefixo: str, timeout: int = 3600):
    """
    Decorator para evitar processamento duplicado.
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):

            payload = kwargs.get("payload") or kwargs
            chave = gerar_chave_idempotente(prefixo, payload)

            if cache.get(chave):
                raise IdempotencyError("Operação já processada.")

            resultado = func(*args, **kwargs)

            cache.set(chave, True, timeout=timeout)

            return resultado

        return wrapper

    return decorator
