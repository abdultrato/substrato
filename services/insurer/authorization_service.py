from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from domain.insurer.authorization_rules import (
    deve_solicitar_autorizacao as should_request_authorization,
)
from domain.insurer.events import AutorizacaoSolicitadaEvent as AuthorizationRequestedEvent
from events.bus import event_bus


class AuthorizationService:
    @staticmethod
    def request(request_id, plan):
        if not should_request_authorization(plan):
            return None

        authorization = ProcedureAuthorization.objects.create(
            name=f"Authorization {request_id}",
            request_id=request_id,
            plan=plan,
        )

        event_bus.publish_after_commit(
            AuthorizationRequestedEvent(autorizacao_id=authorization.id),
        )
        return authorization


"""Fluxo de autorização de procedimentos junto à seguradora."""
