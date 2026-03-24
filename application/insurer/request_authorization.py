from services.insurer.authorization_service import AuthorizationService


class RequestAuthorizationUseCase:
    @staticmethod
    def execute(requisicao, plano):
        return AuthorizationService.request(
            requisicao_id=requisicao.id,
            plano=plano,
        )


SolicitarAutorizacaoUseCase = RequestAuthorizationUseCase
RequestAuthorizationUseCase.executar = RequestAuthorizationUseCase.execute
