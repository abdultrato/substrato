from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.exceptions import APIException

from dominio.contabilidade.excecoes import (
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


def tratar_excecao_dominio(
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


class DominioAPIException(
    APIException,
):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Erro de domínio."
    default_code = "erro_dominio"


def tratar_excecao_api(
    exc: Exception,
):
    """
    Traduz exceções de domínio para resposta HTTP adequada.
    """

    if isinstance(
        exc,
        LedgerImutavelErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        LedgerJaRevertidoErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        ReversaoInvalidaErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        PeriodoContabilFechadoErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        PartidasDesbalanceadasErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        LancamentoSemLinhasSuficientesErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        AlteracaoTipoContaNaoPermitidaErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        ContaComSaldoNaoPodeSerDesativadaErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        ContaInativaErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        ViolacaoInquilinoErro,
    ):
        raise DominioAPIException(
            detail=str(
                exc,
            ),
        )

    raise exc
