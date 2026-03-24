from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class LedgerLineDTO:
    conta_id: int
    valor: str
    natureza: str  # "D" or "C"


@dataclass(frozen=True)
class LedgerEntryCreated:
    entry_id: int
    inquilino_id: int
    data_contabil: date
    linhas: list[LedgerLineDTO]


LinhaLedgerDTO = LedgerLineDTO
LedgerEntryCriado = LedgerEntryCreated
