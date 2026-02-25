from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.frontend.api.views.permissions import IsAdmin


class MaintenanceModeView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({"maintenance_mode": getattr(settings, "MAINTENANCE_MODE", False)})

    def post(self, request):
        enabled = request.data.get("enabled", False)
        settings.MAINTENANCE_MODE = bool(enabled)

        return Response({"maintenance_mode": getattr(settings, "MAINTENANCE_MODE", False)})
