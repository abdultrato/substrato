from django.http import JsonResponse

from servicos.inquilinos.tenant_usage_service import TenantUsageService


class TenantLimitMiddleware:
    """
    Controle técnico de limite de requisições.

    ✔ Usa assinatura ativa
    ✔ Compatível com novo modelo
    ✔ Redis atomic
    ✔ Não conflita com trial
    ✔ Retorna 429 padrão
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        inquilino = getattr(request, "inquilino", None)

        # Sem tenant → segue fluxo
        if not inquilino:
            return self.get_response(request)

        # Trial ignora limite
        if inquilino.esta_em_trial():
            TenantUsageService.incrementar_requisicao(inquilino)
            return self.get_response(request)

        assinatura = inquilino.obter_assinatura_ativa()

        if not assinatura:
            return JsonResponse(
                {"erro": "Tenant sem assinatura ativa."},
                status=403,
            )

        plano = assinatura.plano

        limite = plano.limite_requisicoes_mes or 0
        atual = TenantUsageService.obter_requisicoes(inquilino)

        if limite and atual >= limite:
            return JsonResponse(
                {
                    "erro": "Limite de requisições atingido.",
                    "codigo": "TENANT_LIMIT_REACHED",
                },
                status=429,
            )

        # Incremento ocorre antes da resposta
        TenantUsageService.incrementar_requisicao(inquilino)

        return self.get_response(request)
