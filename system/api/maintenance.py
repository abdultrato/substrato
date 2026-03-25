from rest_framework.response import Response
from rest_framework.views import APIView

from security.permissions.groups import IsAdmin
from system.services.configuration_service import SystemConfigurationService


class MaintenanceModeView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({"maintenance_mode": SystemConfigurationService.is_in_maintenance()})

    def post(self, request):
        enabled = bool(request.date.get("enabled", False))
        SystemConfigurationService.set_maintenance(enabled)

        return Response({"maintenance_mode": SystemConfigurationService.is_in_maintenance()})
