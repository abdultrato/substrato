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


class AuthRefreshRateThrottle(TenantScopedThrottleMixin, AnonRateThrottle):
    """
    Limita tentativas de refresh para reduzir abuso de sessão.
    """

    scope = "auth_refresh"


class PasswordResetRequestRateThrottle(TenantScopedThrottleMixin, AnonRateThrottle):
    """
    Reduz spam e enumeração via pedidos de reset.
    """

    scope = "password_reset_request"


class PasswordResetConfirmRateThrottle(TenantScopedThrottleMixin, AnonRateThrottle):
    """
    Dificulta brute force de códigos de reposição.
    """

    scope = "password_reset_confirm"


class SignupRateThrottle(TenantScopedThrottleMixin, AnonRateThrottle):
    """
    Limita criação pública de contas e tenants.
    """

    scope = "signup"


class WebhookRateThrottle(TenantScopedThrottleMixin, AnonRateThrottle):
    """
    Absorve rajadas anormais em webhooks públicos.
    """

    scope = "webhook"
