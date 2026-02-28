import logging

from django.core.cache import cache
from django.http import JsonResponse

from aplicativos.inquilinos.modelos.inquilino import Inquilino
from infrastrutura.contexto.inquilino import set_inquilino
from servicos.inquilinos.tenant_usage_service import TenantUsageService


logger = logging.getLogger("tenant")

TENANT_CACHE_TTL = 300  # 5 minutos


# =========================================================
# TENANT RESOLUTION
# =========================================================

class TenantMiddleware:
    """
    Resolve o tenant baseado no domínio.

    ✔ Cache Redis
    ✔ select_related("plano")
    ✔ Multi-worker safe
    ✔ Prepara para sharding
    ✔ Limpa contexto após resposta
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        host = request.get_host().split(":")[0]
        cache_key = f"tenant_domain:{host}"

        inquilino = cache.get(cache_key)

        if inquilino is None:
            try:
                inquilino = (
                    Inquilino.objects
                    .select_related("plano")
                    .get(dominio=host, ativo=True)
                )
                cache.set(cache_key, inquilino, TENANT_CACHE_TTL)

            except Inquilino.DoesNotExist:
                inquilino = None

        request.inquilino = inquilino
        set_inquilino(inquilino)

        try:
            response = self.get_response(request)
            return response
        finally:
            # Evita vazamento de contexto entre requests
            set_inquilino(None)


# =========================================================
# TENANT LIMIT
# =========================================================

class TenantLimitMiddleware:
    """
    Rate limit por tenant.

    ✔ Redis backed
    ✔ Seguro para múltiplas instâncias
    ✔ Retorna 429 padrão
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        inquilino = getattr(request, "inquilino", None)

        if not inquilino:
            return self.get_response(request)

        limite = getattr(inquilino.plano, "limite_requisicoes_mes", None)
        atual = TenantUsageService.obter_requisicoes(inquilino)

        if limite and atual >= limite:
            return JsonResponse(
                {
                    "erro": "Limite de requisições atingido.",
                    "codigo": "TENANT_LIMIT_REACHED"
                },
                status=429
            )

        # Incrementa somente após validação
        TenantUsageService.incrementar_requisicao(inquilino)

        return self.get_response(request)
