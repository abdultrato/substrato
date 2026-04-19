"""Eventos de domínio para contabilidade (ledger, conciliação, conta)."""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class AccountingEvent:
    """
    Base event for the accounting domain.
    """

    ocorrido_em: datetime


@dataclass(frozen=True)
class LedgerEntryCreated:
    entry_id: int
    tenant_id: int
    accounting_date: str
    description: str
    external_reference: str
    total_debit: Decimal
    total_credit: Decimal


@dataclass(frozen=True)
class LedgerEntryReversed:
    entry_original_id: int
    entry_reverso_id: int
    tenant_id: int
    reason: str


@dataclass(frozen=True)
class AccountDeactivated:
    account_id: int
    tenant_id: int


@dataclass(frozen=True)
class ReconciliationCompleted:
    invoice_id: int
    tenant_id: int
    accounting_value: Decimal
    received_amount: Decimal
    discrepancy: Decimal
    reconciled: bool


EventoContabil = AccountingEvent
LedgerEntryCriado = LedgerEntryCreated
LedgerEntryRevertido = LedgerEntryReversed
ContaDesativada = AccountDeactivated
ConciliacaoExecutada = ReconciliationCompleted
