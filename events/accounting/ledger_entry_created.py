"""DTOs e evento disparado quando um lançamento contábil é criado."""

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class LedgerLineDTO:
    """Linha de lançamento contábil (débito/crédito) usada em eventos."""

    conta_id: int
    valor: str
    natureza: str  # "D" or "C"


@dataclass(frozen=True)
class LedgerEntryCreated:
    """Evento publicado após a criação de um lançamento contábil."""

    entry_id: int
    inquilino_id: int
    data_contabil: date
    linhas: list[LedgerLineDTO]


LinhaLedgerDTO = LedgerLineDTO
LedgerEntryCriado = LedgerEntryCreated
