from django.core.cache import cache
from django.db import connection
from django.utils.timezone import now
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        db_ok = True
        cache_ok = True

        try:
            connection.ensure_connection()
        except Exception:
            db_ok = False

        try:
            cache.set("health_check", "ok", 5)
            cache_ok = cache.get("health_check") == "ok"
        except Exception:
            cache_ok = False

        return Response(
            {
                "status": "ok" if db_ok and cache_ok else "error",
                "timestamp": now().isoformat(),
                "database": db_ok,
                "cache": cache_ok,
            }
        )
