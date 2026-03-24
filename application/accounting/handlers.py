from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.exceptions import APIException

from domain.accounting.exceptions import (
    AccountTypeChangeNotAllowedError,
    AccountWithBalanceCannotBeDeactivatedError,
    AccountingDomainError,
    ClosedAccountingPeriodError,
    ImmutableLedgerError,
    InactiveAccountError,
    InsufficientEntryLinesError,
    InvalidReversalError,
    LedgerAlreadyReversedError,
    TenantViolationError,
    UnbalancedEntriesError,
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
        AccountingDomainError,
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
        ImmutableLedgerError,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        LedgerAlreadyReversedError,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        InvalidReversalError,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        ClosedAccountingPeriodError,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        UnbalancedEntriesError,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        InsufficientEntryLinesError,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        AccountTypeChangeNotAllowedError,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        AccountWithBalanceCannotBeDeactivatedError,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        InactiveAccountError,
    ):
        raise DomainAPIException(
            detail=str(
                exc,
            ),
        )

    if isinstance(
        exc,
        TenantViolationError,
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
