from django.core.cache import cache
from django.utils.timezone import now
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from observability.metricas import obter_metricas
from observability.saude_sistema import verificar_sistema


class BaseSystemAPIView(APIView):
    """
    Base para endpoints de sistema (health, metrics, status).
    """

    authentication_classes = []
    permission_classes = []

    def success(self, date, http_status=status.HTTP_200_OK):
        return Response(
            {
                "timestamp": now(),
                "status": "success",
                "date": date,
            },
            status=http_status,
        )

    def error(self, message, http_status=status.HTTP_500_INTERNAL_SERVER_ERROR):
        return Response(
            {
                "timestamp": now(),
                "status": "error",
                "message": message,
            },
            status=http_status,
        )


class SystemHealthAPI(BaseSystemAPIView):
    """
    Health check corporativo.
    Ideal para Kubernetes, Load Balancer e monitoramento externo.
    """

    def get(self, request):
        try:
            system_result = verificar_sistema()

            http_status = (
                status.HTTP_200_OK
                if system_result.get("status") == "ok"
                else status.HTTP_503_SERVICE_UNAVAILABLE
            )

            return self.success(system_result, http_status)

        except Exception as e:
            return self.error(str(e))


class MetricsAPI(BaseSystemAPIView):
    """
    Endpoint de métricas internas.
    Pode ser consumido por Prometheus, Grafana ou monitor interno.
    """

    CACHE_KEY = "system_metrics"
    CACHE_TIMEOUT = 10  # segundos

    def get(self, request):
        try:
            metrics_date = cache.get(self.CACHE_KEY)

            if not metrics_date:
                metrics_date = obter_metricas()
                cache.set(self.CACHE_KEY, metrics_date, self.CACHE_TIMEOUT)

            return self.success(metrics_date)

        except Exception as e:
            return self.error(str(e))
