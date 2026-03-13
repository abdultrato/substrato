from aplicativos.seguradora.modelos.autorizacao import AutorizacaoProcedimento
from dominio.seguradora.regras_autorizacao import deve_solicitar_autorizacao
from eventos.publicador import publicar_evento
from eventos.tipos import AUTORIZACAO_SOLICITADA

class ServicoAutorizacao:

    @staticmethod
    def solicitar(requisicao_id, plano):

        if not deve_solicitar_autorizacao(plano):
            return None

        autorizacao = AutorizacaoProcedimento.objects.create(
            requisicao_id=requisicao_id,
            plano=plano,
        )

        publicar_evento(
            AUTORIZACAO_SOLICITADA,
            {
                "autorizacao_id": autorizacao.id,
            }
        )

        return autorizacao
