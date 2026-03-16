from servicos.seguradora.servico_autorizacao import ServicoAutorizacao


class SolicitarAutorizacaoUseCase:
    @staticmethod
    def executar(requisicao, plano):
        return ServicoAutorizacao.solicitar(
            requisicao_id=requisicao.id,
            plano=plano,
        )
