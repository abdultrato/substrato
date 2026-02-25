from rest_framework.views import APIView
from rest_framework.response import Response

class MetricasAPI(APIView):
    def get(self, request):
        return Response({"uptime": "ok"})


from rest_framework.views import APIView
from rest_framework.response import Response
from observabilidade.metricas import obter_metricas

class MetricasAPI(APIView):
    def get(self, request):
        return Response(obter_metricas())


from rest_framework.views import APIView
from rest_framework.response import Response
from observabilidade.saude_sistema import verificar_sistema

class SaudeSistemaAPI(APIView):
    def get(self, request):
        return Response(verificar_sistema())
