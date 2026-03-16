from rest_framework.response import Response
from rest_framework.views import APIView

from seguranca.permissoes.grupos import IsAdmin
from sistema.service.configuracao_service import ConfiguracaoSistemaService


class MaintenanceModeView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({"maintenance_mode": ConfiguracaoSistemaService.esta_em_manutencao()})

    def post(self, request):
        enabled = bool(request.data.get("enabled", False))
        ConfiguracaoSistemaService.definir_manutencao(enabled)

        return Response({"maintenance_mode": ConfiguracaoSistemaService.esta_em_manutencao()})
