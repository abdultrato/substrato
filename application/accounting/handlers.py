from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.exceptions import APIException

from domain.accounting.excecoes import (
    AlteracaoTipoContaNaoPermitidaErro,
    ContaComSaldoNaoPodeSerDesativadaErro,
    ContaInativaErro,
    DominioContabilidadeErro,
    LancamentoSemLinhasSuficientesErro,
    LedgerImutavelErro,
    LedgerJaRevertidoErro,
    PartidasDesbalanceadasErro,
    PeriodoContabilFechadoErro,
    ReversaoInvalidaErro,
    ViolacaoInquilinoErro,
)

# =========================================================
# HANDLER DJANGO (Admin / Serviços internos)
# =========================================================


def handle_domain_exception(
    exc: Exception,
):
    """
    Traduz exceções de domínio para ValidationError.
    Usado em serviços e admin.
    """

    if isinstance(
        exc,
        DominioContabilidadeErro,
    ):
        raise ValidationError(
            str(
                exc,
            ),
        )

    raise exc


# =========================================================
# HANDLER API (DRF)
# =========================================================


class DomainAPIException(
    APIException,
):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Erro de domínio."
    default_code = "erro_dominio"


def handle_api_exception(
    exc: Exception,
):
    """
    Traduz exceções de domínio para resposta HTTP adequada.
    """

    if isinstance(
        exc,
        LedgerImutavelErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        LedgerJaRevertidoErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        ReversaoInvalidaErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        PeriodoContabilFechadoErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        PartidasDesbalanceadasErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        LancamentoSemLinhasSuficientesErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        AlteracaoTipoContaNaoPermitidaErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        ContaComSaldoNaoPodeSerDesativadaErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        ContaInativaErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        ViolacaoInquilinoErro,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    raise exc


DominioAPIException = DomainAPIException
tratar_excecao_dominio = handle_domain_exception
tratar_excecao_api = handle_api_exception
