"""Middleware que bloqueia requisições quando o modo manutenção está ativo."""

from django.http import JsonResponse

from system.services.configuration_service import SystemConfigurationService


class MaintenanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        # permitir superusers
        if SystemConfigurationService.is_in_maintenance() and not request.user.is_superuser:
            return JsonResponse(
                {"detail": "Sistema em manutenção."},
                status=503,
            )

        return self.get_response(request)
