from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


# =========================================================
# EVENTO BASE
# =========================================================


@dataclass(
		frozen = True,
		)
class EventoContabil:
	"""
	Evento base do domínio contábil.
	"""
	
	ocorrido_em: datetime


# =========================================================
# LEDGER ENTRY CRIADO
# =========================================================


@dataclass(
		frozen = True,
		)
class LedgerEntryCriado(
		EventoContabil,
		):
	
	entry_id: int
	inquilino_id: int
	data_contabil: str
	descricao: str
	referencia_externa: str
	
	total_debito: Decimal
	total_credito: Decimal


# =========================================================
# LEDGER ENTRY REVERTIDO
# =========================================================


@dataclass(
		frozen = True,
		)
class LedgerEntryRevertido(
		EventoContabil,
		):
	
	entry_original_id: int
	entry_reverso_id: int
	inquilino_id: int
	motivo: str


# =========================================================
# CONTA DESATIVADA
# =========================================================


@dataclass(
		frozen = True,
		)
class ContaDesativada(
		EventoContabil,
		):
	
	conta_id: int
	inquilino_id: int


# =========================================================
# CONCILIAÇÃO EXECUTADA
# =========================================================


@dataclass(
		frozen = True,
		)
class ConciliacaoExecutada(
		EventoContabil,
		):
	
	fatura_id: int
	inquilino_id: int
	valor_contabil: Decimal
	valor_recebido: Decimal
	divergencia: Decimal
	conciliado: bool
