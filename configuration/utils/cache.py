"""Views utilitárias para inspecionar/limpar cache."""

from django.core.cache import cache
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class CacheStatusView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        cache.set("health_check", "ok", 5)
        status = cache.get("health_check")

        return Response({"cache_status": "ok" if status == "ok" else "error"})


class CacheClearView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        cache.clear()
        return Response({"status": "cache cleared"})
