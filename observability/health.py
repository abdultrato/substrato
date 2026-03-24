from django.db import connection
from django.utils.timezone import now
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheckView(APIView):
    """
    Endpoint de saúde da API.

    ✔ monitoramento
    ✔ uptime check
    ✔ pronto para Docker/Kubernetes
    ✔ pronto para load balancer
    ✔ pronto para CI/CD
    """

    permission_classes = [AllowAny]

    def get(self, request):
        db_ok = True

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception:
            db_ok = False

        return Response(
            {
                "status": "ok",
                "timestamp": now(),
                "database": "ok" if db_ok else "error",
                "api_version": "v1",
            }
        )
