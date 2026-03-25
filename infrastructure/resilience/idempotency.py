from functools import wraps
from hashlib import sha256
import json

from django.core.cache import cache


class IdempotencyError(Exception):
    pass


def generate_idempotency_key(prefix: str, payload: dict) -> str:
    """
    Gera key determinística baseada no conteúdo.
    """

    base = json.dumps(payload, sort_keys=True)
    hash_key = sha256(base.encode()).hexdigest()
    return f"idemp:{prefix}:{hash_key}"


def idempotent(prefix: str, timeout: int = 3600):
    """
    Decorator para evitar processamento duplicado.
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            payload = kwargs.get("payload") or kwargs
            key = generate_idempotency_key(prefix, payload)

            if cache.get(key):
                raise IdempotencyError("Operação já processada.")

            result = func(*args, **kwargs)
            cache.set(key, True, timeout=timeout)
            return result

        return wrapper

    return decorator


gerar_key_idempotente = generate_idempotency_key
idempotente = idempotent
