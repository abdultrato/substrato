from django.db import transaction

from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from services.insurer.integration_service import InsurerIntegrationService


class ProcessAuthorizationService:
    @staticmethod
    @transaction.atomic
    def execute(authorization_id: int):
        authorization = ProcedureAuthorization.objects.select_for_update().get(id=authorization_id)

        if authorization.status != authorization.Status.PENDENTE:
            return "ignored"

        adapter = InsurerIntegrationService.get_adapter(authorization.plano.seguradora)
        response = adapter.consultar_autorizacao({"requisicao_id": authorization.requisicao_id})

        if response["status"] == "APROVADA":
            authorization.mark_response(
                ProcedureAuthorization.Status.APROVADA,
                authorization_code=response.get("codigo"),
            )
        else:
            authorization.mark_response(ProcedureAuthorization.Status.NEGADA)

        return "processed"


ProcessarAutorizacaoService = ProcessAuthorizationService
ProcessAuthorizationService.executar = ProcessAuthorizationService.execute
