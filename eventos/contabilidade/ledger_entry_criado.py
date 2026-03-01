from dataclasses import dataclass
from datetime import date
from typing import List


@dataclass(
		frozen = True,
		)
class LinhaLedgerDTO:
	conta_id: int
	valor: str
	natureza: str  # "D" ou "C"


@dataclass(
		frozen = True,
		)
class LedgerEntryCriado:
	entry_id: int
	inquilino_id: int
	data_contabil: date
	linhas: List[LinhaLedgerDTO]
