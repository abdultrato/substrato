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
    inquilino_id: int
    data_contabil: str
    descricao: str
    referencia_externa: str
    total_debito: Decimal
    total_credito: Decimal


@dataclass(frozen=True)
class LedgerEntryReversed:
    entry_original_id: int
    entry_reverso_id: int
    inquilino_id: int
    motivo: str


@dataclass(frozen=True)
class AccountDeactivated:
    conta_id: int
    inquilino_id: int


@dataclass(frozen=True)
class ReconciliationCompleted:
    fatura_id: int
    inquilino_id: int
    valor_contabil: Decimal
    valor_recebido: Decimal
    divergencia: Decimal
    conciliado: bool


EventoContabil = AccountingEvent
LedgerEntryCriado = LedgerEntryCreated
LedgerEntryRevertido = LedgerEntryReversed
ContaDesativada = AccountDeactivated
ConciliacaoExecutada = ReconciliationCompleted
