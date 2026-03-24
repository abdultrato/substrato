from time import monotonic

from django.db import connection
from django.utils.timezone import now
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthAPI(APIView):
    """
    Liveness probe.
    Confirma que o processo responde.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "timestamp": now(),
            },
            status=status.HTTP_200_OK,
        )


class DetailedHealthAPI(APIView):
    """
    Readiness probe.
    Verifica dependências críticas.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        start_time = monotonic()
        checks = {}

        checks["database"] = self._check_database()

        duration_ms = round((monotonic() - start_time) * 1000, 2)

        is_healthy = all(check_result["status"] == "ok" for check_result in checks.values())

        return Response(
            {
                "status": "ok" if is_healthy else "error",
                "timestamp": now(),
                "duration_ms": duration_ms,
                "checks": checks,
            },
            status=status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def _check_database(self):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            return {"status": "ok"}
        except Exception as e:
            return {
                "status": "error",
                "detail": str(e),
            }
