import logging

from django.core.cache import cache

from apps.tenants.models.tenant import Tenant
from infrastructure.context.tenant import set_inquilino

logger = logging.getLogger("tenant")

TENANT_CACHE_TTL = 300  # 5 minutos


# =========================================================
# TENANT RESOLUTION
# =========================================================


class TenantMiddleware:
    """
    Resolve o tenant baseado no domínio.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        host = request.get_host().split(":")[0]
        cache_key = f"tenant_domain:{host}"

        inquilino = cache.get(cache_key)

        if inquilino is None:
            try:
                inquilino = Tenant.objects.select_related("plano").get(dominio=host, ativo=True)
                cache.set(cache_key, inquilino, TENANT_CACHE_TTL)

            except Tenant.DoesNotExist:
                inquilino = None

        request.inquilino = inquilino
        set_inquilino(inquilino)

        try:
            return self.get_response(request)
        finally:
            # Evita vazamento de contexto entre requests
            set_inquilino(None)
