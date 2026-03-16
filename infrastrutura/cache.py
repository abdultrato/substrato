from django.core.cache import cache
from django_redis import get_redis_connection

DEFAULT_TIMEOUT = 600  # 10 minutos


# =========================================================
# GENERIC CACHE UTILS
# =========================================================


class CacheService:
    """
    Serviço de cache genérico.

    ✔ Wrapper centralizado
    ✔ Evita duplicação
    ✔ Namespace opcional
    """

    @staticmethod
    def get(key):
        return cache.get(key)

    @staticmethod
    def set(key, value, timeout=DEFAULT_TIMEOUT):
        cache.set(key, value, timeout)

    @staticmethod
    def delete(key):
        cache.delete(key)

    @staticmethod
    def remember(key, func, timeout=DEFAULT_TIMEOUT):
        value = cache.get(key)

        if value is None:
            value = func()
            cache.set(key, value, timeout)

        return value


# =========================================================
# TENANT CACHE
# =========================================================


class TenantCache:
    """
    Cache isolado por tenant.

    ✔ Namespace automático
    ✔ Seguro para multi-worker
    ✔ Compatível com rate limit
    """

    PREFIX = "tenant"

    @staticmethod
    def _key(tenant_id: int, suffix: str) -> str:
        return f"{TenantCache.PREFIX}:{tenant_id}:{suffix}"

    @staticmethod
    def get(tenant_id: int, suffix: str):
        return cache.get(TenantCache._key(tenant_id, suffix))

    @staticmethod
    def set(tenant_id: int, suffix: str, value, timeout=DEFAULT_TIMEOUT):
        cache.set(
            TenantCache._key(tenant_id, suffix),
            value,
            timeout,
        )

    @staticmethod
    def delete(tenant_id: int, suffix: str):
        cache.delete(TenantCache._key(tenant_id, suffix))

    @staticmethod
    def incr(tenant_id: int, suffix: str, amount=1, timeout=DEFAULT_TIMEOUT):
        """
        Incremento seguro:
        ✔ Se chave não existir, cria
        ✔ Seguro sob concorrência
        """

        key = TenantCache._key(tenant_id, suffix)
        try:
            conn = get_redis_connection("default")
        except NotImplementedError:
            # Ex.: LocMemCache em desenvolvimento.
            try:
                return cache.incr(key, amount)
            except Exception:
                cache.set(key, amount, timeout)
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
                return cache.incr(key, amount)
