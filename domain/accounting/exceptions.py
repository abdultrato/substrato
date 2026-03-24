class AccountingDomainError(Exception):
    """
    Base class for accounting domain exceptions.
    """

    pass


class ImmutableLedgerError(AccountingDomainError):
    """
    Raised when attempting to change or delete a ledger entry.
    """

    pass


class LedgerAlreadyReversedError(AccountingDomainError):
    """
    Raised when a ledger entry has already been reversed.
    """

    pass


class InvalidReversalError(AccountingDomainError):
    """
    Raised when an invalid reversal is attempted.
    """

    pass


class ClosedAccountingPeriodError(AccountingDomainError):
    """
    Raised when an operation targets a closed accounting period.
    """

    pass


class UnbalancedEntriesError(AccountingDomainError):
    """
    Raised when debits and credits do not match.
    """

    pass


class InsufficientEntryLinesError(AccountingDomainError):
    """
    Raised when an entry has fewer than two lines.
    """

    pass


class AccountTypeChangeNotAllowedError(AccountingDomainError):
    """
    Raised when an account type cannot be changed.
    """

    pass


class AccountWithBalanceCannotBeDeactivatedError(AccountingDomainError):
    """
    Raised when an account with balance is deactivated.
    """

    pass


class InactiveAccountError(AccountingDomainError):
    """
    Raised when a posting uses an inactive account.
    """

    pass


class TenantViolationError(AccountingDomainError):
    """
    Raised when an operation crosses tenant boundaries.
    """

    pass


DominioContabilidadeErro = AccountingDomainError
LedgerImutavelErro = ImmutableLedgerError
LedgerJaRevertidoErro = LedgerAlreadyReversedError
ReversaoInvalidaErro = InvalidReversalError
PeriodoContabilFechadoErro = ClosedAccountingPeriodError
PartidasDesbalanceadasErro = UnbalancedEntriesError
LancamentoDesbalanceado = UnbalancedEntriesError
LancamentoSemLinhasSuficientesErro = InsufficientEntryLinesError
AlteracaoTipoContaNaoPermitidaErro = AccountTypeChangeNotAllowedError
ContaComSaldoNaoPodeSerDesativadaErro = AccountWithBalanceCannotBeDeactivatedError
ContaInativaErro = InactiveAccountError
ViolacaoInquilinoErro = TenantViolationError
