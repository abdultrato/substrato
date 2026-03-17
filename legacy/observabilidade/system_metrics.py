from frontend.api.core.core import cache_stats
from frontend.api.viewsets.permissions_api import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView


class CacheMetricsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(cache_stats())
