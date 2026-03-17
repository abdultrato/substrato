from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from dominio.seguradora.regras_autorizacao import deve_solicitar_autorizacao
from dominio.seguradora.eventos import AutorizacaoSolicitadaEvent
from eventos.bus import event_bus


class ServicoAutorizacao:
    @staticmethod
    def solicitar(requisicao_id, plano):

        if not deve_solicitar_autorizacao(plano):
            return None

        autorizacao = AutorizacaoProcedimento.objects.create(
            requisicao_id=requisicao_id,
            plano=plano,
        )

        event_bus.publish_after_commit(
            AutorizacaoSolicitadaEvent(autorizacao_id=autorizacao.id),
        )

        return autorizacao
