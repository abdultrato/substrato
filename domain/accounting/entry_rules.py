from decimal import Decimal

from domain.accounting.exceptions import (
    InactiveAccountError,
    InsufficientEntryLinesError,
    UnbalancedEntriesError,
)
from domain.accounting.value_objects import EntryNature, MoneyValue


class DomainLine:
    def __init__(
        self,
        account_id: int,
        account_type: str,
        account_active: bool,
        value: MoneyValue,
        nature: EntryNature,
    ):
        self.account_id = account_id
        self.account_type = account_type
        self.account_active = account_active
        self.value = value
        self.nature = nature


class LedgerEntryRules:
    @staticmethod
    def validate(linhas: list[DomainLine]):
        LedgerEntryRules._validate_minimum_lines(linhas)
        LedgerEntryRules._validate_active_accounts(linhas)
        LedgerEntryRules._validate_positive_values(linhas)
        LedgerEntryRules._validate_balance(linhas)

    @staticmethod
    def _validate_minimum_lines(linhas: list[DomainLine]):
        if len(linhas) < 2:
            raise InsufficientEntryLinesError("Lançamento deve possuir no mínimo duas linhas.")

    @staticmethod
    def _validate_active_accounts(linhas: list[DomainLine]):
        for linha in linhas:
            if not linha.account_active:
                raise InactiveAccountError(f"Conta {linha.account_id} está inativa.")

    @staticmethod
    def _validate_positive_values(linhas: list[DomainLine]):
        for linha in linhas:
            if linha.value.value <= Decimal("0.00"):
                raise ValueError(f"Valor inválido na account {linha.account_id}.")

    @staticmethod
    def _validate_balance(linhas: list[DomainLine]):
        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")

        for linha in linhas:
            if linha.nature.type == "D":
                total_debit += linha.value.value
            else:
                total_credit += linha.value.value

        if total_debit != total_credit:
            raise UnbalancedEntriesError(f"Débitos ({total_debit}) diferem de créditos ({total_credit}).")


LinhaDominio = DomainLine
RegrasLancamento = LedgerEntryRules
LedgerEntryRules.validar = staticmethod(LedgerEntryRules.validate)
LedgerEntryRules._validar_minimo_linhas = staticmethod(LedgerEntryRules._validate_minimum_lines)
LedgerEntryRules._validar_contas_ativas = staticmethod(LedgerEntryRules._validate_active_accounts)
LedgerEntryRules._validar_valores_positivos = staticmethod(LedgerEntryRules._validate_positive_values)
LedgerEntryRules._validar_balanceamento = staticmethod(LedgerEntryRules._validate_balance)
