from apps.insurer.models.procedure_authorization import ProcedureAuthorization
from domain.insurer.regras_autorizacao import deve_solicitar_autorizacao
from domain.insurer.events import AutorizacaoSolicitadaEvent
from events.bus import event_bus


class ServicoAutorizacao:
    @staticmethod
    def solicitar(requisicao_id, plano):

        if not deve_solicitar_autorizacao(plano):
            return None

        autorizacao = ProcedureAuthorization.objects.create(
            requisicao_id=requisicao_id,
            plano=plano,
        )

        event_bus.publish_after_commit(
            AutorizacaoSolicitadaEvent(autorizacao_id=autorizacao.id),
        )

        return autorizacao
