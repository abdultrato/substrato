from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.frontend.api.views.permissions import IsAdmin


class FeatureFlagsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        flags = getattr(settings, "FEATURE_FLAGS", {})
        return Response(flags)

    def post(self, request):
        flags = getattr(settings, "FEATURE_FLAGS", {})
        key = request.data.get("key")
        value = request.data.get("value")

        if not key:
            return Response({"error": "key é obrigatório"}, status=400)

        flags[key] = value
        settings.FEATURE_FLAGS = flags

        return Response(flags)
