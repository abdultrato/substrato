from services.insurer.servico_autorizacao import ServicoAutorizacao


class RequestAuthorizationUseCase:
    @staticmethod
    def execute(requisicao, plano):
        return ServicoAutorizacao.solicitar(
            requisicao_id=requisicao.id,
            plano=plano,
        )


SolicitarAutorizacaoUseCase = RequestAuthorizationUseCase
RequestAuthorizationUseCase.executar = RequestAuthorizationUseCase.execute
