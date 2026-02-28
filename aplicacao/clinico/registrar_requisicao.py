from aplicacao.seguradora.solicitar_autorizacao import (
    SolicitarAutorizacaoUseCase
)

if paciente.plano_cobertura:
    SolicitarAutorizacaoUseCase.executar(
        requisicao=requisicao,
        plano=paciente.plano_cobertura,
    )
