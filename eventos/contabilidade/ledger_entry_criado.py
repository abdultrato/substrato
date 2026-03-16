from dataclasses import dataclass
from datetime import date


@dataclass(
    frozen=True,
)
class LinhaLedgerDTO:
    conta_id: int
    valor: str
    natureza: str  # "D" ou "C"


@dataclass(
    frozen=True,
)
class LedgerEntryCriado:
    entry_id: int
    inquilino_id: int
    data_contabil: date
    linhas: list[LinhaLedgerDTO]
