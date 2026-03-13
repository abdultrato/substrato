from aplicacao.seguradora.solicitar_autorizacao import SolicitarAutorizacaoUseCase


def registrar_requisicao(requisicao, paciente):
    """
    Dispara solicitação de autorização junto à seguradora quando o paciente possui cobertura.
    """
    plano = getattr(paciente, "plano_cobertura", None)
    if plano:
        SolicitarAutorizacaoUseCase.executar(
            requisicao=requisicao,
            plano=plano,
        )
