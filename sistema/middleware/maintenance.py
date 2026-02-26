from django.http import JsonResponse
from sistema.services.configuracao_service import ConfiguracaoSistemaService


class MaintenanceMiddleware:

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        if ConfiguracaoSistemaService.esta_em_manutencao():

            # permitir superusers
            if not request.user.is_superuser:
                return JsonResponse(
                    {"detail": "Sistema em manutenção."},
                    status=503,
                )

        return self.get_response(request)
