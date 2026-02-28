from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import now
from django.core.cache import cache

from observabilidade.metricas import obter_metricas
from observabilidade.saude_sistema import verificar_sistema


class BaseSystemAPIView(APIView):
	"""
	Base para endpoints de sistema (health, metrics, status).
	"""
	
	authentication_classes = []
	permission_classes = []
	
	def success(self, data, http_status = status.HTTP_200_OK):
		return Response(
				{
						"timestamp": now(),
						"status"   : "success",
						"data"     : data,
						},
				status = http_status,
				)
	
	def error(
			self, message, http_status = status.HTTP_500_INTERNAL_SERVER_ERROR
			):
		return Response(
				{
						"timestamp": now(),
						"status"   : "error",
						"message"  : message,
						},
				status = http_status,
				)


class SaudeSistemaAPI(BaseSystemAPIView):
	"""
	Health check corporativo.
	Ideal para Kubernetes, Load Balancer e monitoramento externo.
	"""
	
	def get(self, request):
		try:
			resultado = verificar_sistema()
			
			http_status = (
					status.HTTP_200_OK
					if resultado.get("status") == "ok"
					else status.HTTP_503_SERVICE_UNAVAILABLE
			)
			
			return self.success(resultado, http_status)
		
		except Exception as e:
			return self.error(str(e))


class MetricasAPI(BaseSystemAPIView):
	"""
	Endpoint de métricas internas.
	Pode ser consumido por Prometheus, Grafana ou monitor interno.
	"""
	
	CACHE_KEY = "metricas_sistema"
	CACHE_TIMEOUT = 10  # segundos
	
	def get(self, request):
		try:
			metricas = cache.get(self.CACHE_KEY)
			
			if not metricas:
				metricas = obter_metricas()
				cache.set(self.CACHE_KEY, metricas, self.CACHE_TIMEOUT)
			
			return self.success(metricas)
		
		except Exception as e:
			return self.error(str(e))
