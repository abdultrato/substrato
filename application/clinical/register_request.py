from application.insurer.request_authorization import RequestAuthorizationUseCase


def register_request(requisicao, paciente):
    """
    Dispara solicitação de autorização junto à seguradora quando o paciente possui cobertura.
    """
    plano = getattr(paciente, "plano_cobertura", None)
    if plano:
        RequestAuthorizationUseCase.execute(
            requisicao=requisicao,
            plano=plano,
        )


registrar_requisicao = register_request
