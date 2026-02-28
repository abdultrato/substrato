from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import now

from seguranca.permissoes.grupos import IsAdmin
from sistema.service.configuracao_service import ConfiguracaoSistemaService


class MaintenanceModeView(APIView):
	"""
	Controla o modo de manutenção global do sistema.
	"""
	
	permission_classes = [IsAdmin]
	
	def get(self, request):
		ativo = ConfiguracaoSistemaService.esta_em_manutencao()
		
		return Response(
				{
						"timestamp"       : now(),
						"maintenance_mode": ativo,
						}
				)
	
	def post(self, request):
		enabled = request.data.get("enabled")
		
		if enabled is None:
			return Response(
					{"detail": "Campo 'enabled' é obrigatório."},
					status = status.HTTP_400_BAD_REQUEST,
					)
		
		if not isinstance(enabled, bool):
			return Response(
					{"detail": "Campo 'enabled' deve ser booleano."},
					status = status.HTTP_400_BAD_REQUEST,
					)
		
		estado_anterior = ConfiguracaoSistemaService.esta_em_manutencao()
		
		if estado_anterior == enabled:
			return Response(
					{
							"maintenance_mode": estado_anterior,
							"message"         : "Nenhuma alteração realizada.",
							}
					)
		
		ConfiguracaoSistemaService.definir_manutencao(
				enabled = enabled,
				alterado_por = request.user,
				)
		
		return Response(
				{
						"timestamp"       : now(),
						"maintenance_mode": enabled,
						"changed_by"      : request.user.id,
						},
				status = status.HTTP_200_OK,
				)
