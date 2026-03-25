from django.http import JsonResponse

from services.tenants.tenant_usage_service import TenantUsageService


class TenantLimitMiddleware:
    """
    Controle técnico de limite de requisições.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        tenant = getattr(request, "tenant", None)

        # Sem tenant → segue fluxo
        if not tenant:
            return self.get_response(request)

        # Trial ignora limite
        if tenant.esta_em_trial():
            TenantUsageService.increment_request(tenant)
            return self.get_response(request)

        assinatura = tenant.get_active_subscription()

        if not assinatura:
            return JsonResponse(
                {"error": "Tenant sem assinatura active."},
                status=403,
            )

        plan = assinatura.plan

        limite = plan.monthly_request_limit or 0
        atual = TenantUsageService.get_requests(tenant)

        if limite and atual >= limite:
            return JsonResponse(
                {
                    "error": "Limite de requisições atingido.",
                    "code": "TENANT_LIMIT_REACHED",
                },
                status=429,
            )

        # Incremento ocorre antes da response
        TenantUsageService.increment_request(tenant)

        return self.get_response(request)
