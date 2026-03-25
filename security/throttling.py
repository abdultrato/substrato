from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class TenantScopedThrottleMixin:
    """
    Isola throttle por tenant.

    Chave final:
    throttle:{tenant_id}:{user_id}:{scope}
    """

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user and request.user.is_authenticated else self.get_ident(request)

        tenant = getattr(request, "tenant", None)
        tenant_id = getattr(tenant, "id", "global")

        return f"throttle:{tenant_id}:{ident}:{self.scope}"


# =========================================================
# USER THROTTLES
# =========================================================


class BurstRateThrottle(TenantScopedThrottleMixin, UserRateThrottle):
    """
    Limite agressivo contra picos.
    """

    scope = "burst"


class SustainedRateThrottle(TenantScopedThrottleMixin, UserRateThrottle):
    """
    Controle de uso contínuo.
    """

    scope = "sustained"


# =========================================================
# ANON THROTTLES
# =========================================================


class AnonBurstRateThrottle(TenantScopedThrottleMixin, AnonRateThrottle):
    """
    Proteção para usuários não autenticados.
    """

    scope = "anon_burst"


class LoginRateThrottle(TenantScopedThrottleMixin, AnonRateThrottle):
    """
    Proteção específica para login.
    """

    scope = "login"
