from django.core.cache import cache
from django_redis import get_redis_connection

DEFAULT_TIMEOUT = 600  # 10 minutos


# =========================================================
# GENERIC CACHE UTILS
# =========================================================


class CacheService:
    """
    Serviço de cache genérico.
    """

    @staticmethod
    def get(key):
        try:
            return cache.get(key)
        except Exception:
            return None

    @staticmethod
    def set(key, value, timeout=DEFAULT_TIMEOUT):
        try:
            cache.set(key, value, timeout)
        except Exception:
            return None
        return value

    @staticmethod
    def delete(key):
        try:
            cache.delete(key)
        except Exception:
            return None
        return key

    @staticmethod
    def remember(key, func, timeout=DEFAULT_TIMEOUT):
        value = CacheService.get(key)

        if value is None:
            value = func()
            CacheService.set(key, value, timeout)

        return value


# =========================================================
# TENANT CACHE
# =========================================================


class TenantCache:
    """
    Cache isolado por tenant.
    """

    PREFIX = "tenant"

    @staticmethod
    def _key(tenant_id: int, suffix: str) -> str:
        return f"{TenantCache.PREFIX}:{tenant_id}:{suffix}"

    @staticmethod
    def get(tenant_id: int, suffix: str):
        try:
            return cache.get(TenantCache._key(tenant_id, suffix))
        except Exception:
            return None

    @staticmethod
    def set(tenant_id: int, suffix: str, value, timeout=DEFAULT_TIMEOUT):
        try:
            cache.set(
                TenantCache._key(tenant_id, suffix),
                value,
                timeout,
            )
        except Exception:
            return None
        return value

    @staticmethod
    def delete(tenant_id: int, suffix: str):
        try:
            cache.delete(TenantCache._key(tenant_id, suffix))
        except Exception:
            return None
        return suffix

    @staticmethod
    def incr(tenant_id: int, suffix: str, amount=1, timeout=DEFAULT_TIMEOUT):
        """
        Incrementa o contador do tenant com fallback transacional.
        """

        key = TenantCache._key(tenant_id, suffix)
        try:
            conn = get_redis_connection("default")
        except Exception:
            # Fallback para LocMemCache quando Redis não estiver disponível.
            try:
                return cache.incr(key, amount)
            except Exception:
                try:
                    cache.set(key, amount, timeout)
                except Exception:
                    return amount
                return amount

        with conn.pipeline() as pipe:
            try:
                pipe.watch(key)
                current = pipe.get(key)

                pipe.multi()

                if current is None:
                    pipe.set(key, amount, ex=timeout)
                    result = amount
                else:
                    pipe.incr(key, amount)
                    result = int(current) + amount

                pipe.execute()
                return result

            except Exception:
                pipe.reset()
                try:
                    # Pode falhar se a key foi expirada entre o watch e o incr.
                    return cache.incr(key, amount)
                except Exception:
                    # Se a key não existir, inicializa e devolve o value inicial.
                    try:
                        cache.set(key, amount, timeout)
                    except Exception:
                        return amount
                    return amount
