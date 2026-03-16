from time import monotonic

from django.db import connection
from django.utils.timezone import now
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class SaudeAPI(APIView):
    """
    Liveness probe.
    Apenas confirma que o processo está vivo.
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


class SaudeDetalhadaAPI(APIView):
    """
    Readiness probe.
    Verifica dependências críticas.
    """

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        inicio = monotonic()
        checks = {}

        checks["database"] = self._check_database()

        duracao_ms = round((monotonic() - inicio) * 1000, 2)

        ok = all(resultado["status"] == "ok" for resultado in checks.values())

        return Response(
            {
                "status": "ok" if ok else "error",
                "timestamp": now(),
                "duration_ms": duracao_ms,
                "checks": checks,
            },
            status=status.HTTP_200_OK if ok else status.HTTP_503_SERVICE_UNAVAILABLE,
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
