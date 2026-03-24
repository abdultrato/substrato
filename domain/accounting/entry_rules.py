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
        conta_id: int,
        conta_tipo: str,
        conta_ativa: bool,
        valor: MoneyValue,
        natureza: EntryNature,
    ):
        self.conta_id = conta_id
        self.conta_tipo = conta_tipo
        self.conta_ativa = conta_ativa
        self.valor = valor
        self.natureza = natureza


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
            if not linha.conta_ativa:
                raise InactiveAccountError(f"Conta {linha.conta_id} está inativa.")

    @staticmethod
    def _validate_positive_values(linhas: list[DomainLine]):
        for linha in linhas:
            if linha.valor.valor <= Decimal("0.00"):
                raise ValueError(f"Valor inválido na conta {linha.conta_id}.")

    @staticmethod
    def _validate_balance(linhas: list[DomainLine]):
        total_debito = Decimal("0.00")
        total_credito = Decimal("0.00")

        for linha in linhas:
            if linha.natureza.tipo == "D":
                total_debito += linha.valor.valor
            else:
                total_credito += linha.valor.valor

        if total_debito != total_credito:
            raise UnbalancedEntriesError(f"Débitos ({total_debito}) diferem de créditos ({total_credito}).")


LinhaDominio = DomainLine
RegrasLancamento = LedgerEntryRules
LedgerEntryRules.validar = staticmethod(LedgerEntryRules.validate)
LedgerEntryRules._validar_minimo_linhas = staticmethod(LedgerEntryRules._validate_minimum_lines)
LedgerEntryRules._validar_contas_ativas = staticmethod(LedgerEntryRules._validate_active_accounts)
LedgerEntryRules._validar_valores_positivos = staticmethod(LedgerEntryRules._validate_positive_values)
LedgerEntryRules._validar_balanceamento = staticmethod(LedgerEntryRules._validate_balance)
