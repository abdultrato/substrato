from django.db import connection
from django.utils.timezone import now
from rest_framework.response import Response
from rest_framework.views import APIView

from backend.frontend.api.views.permissions import IsAdmin


class MetricsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        db_connections = len(connection.queries)

        return Response(
            {
                "timestamp": now(),
                "db_queries_count": db_connections,
                "status": "ok",
            }
        )
