from decimal import Decimal
from typing import List

from dominio.contabilidade.excecoes import (
	ContaInativaErro,
	LancamentoSemLinhasSuficientesErro,
	PartidasDesbalanceadasErro,
	)
from dominio.contabilidade.objetos_valor import (
	NaturezaLancamento,
	ValorMonetario,
	)


# =========================================================
# REPRESENTAÇÃO DE LINHA (Domínio puro)
# =========================================================


class LinhaDominio:
	
	def __init__(
			self,
			conta_id: int,
			conta_tipo: str,
			conta_ativa: bool,
			valor: ValorMonetario,
			natureza: NaturezaLancamento,
			):
		self.conta_id = conta_id
		self.conta_tipo = conta_tipo
		self.conta_ativa = conta_ativa
		self.valor = valor
		self.natureza = natureza


# =========================================================
# REGRAS DE LANÇAMENTO
# =========================================================


class RegrasLancamento:
	
	@staticmethod
	def validar(
			linhas: List[LinhaDominio],
			):
		
		RegrasLancamento._validar_minimo_linhas(
				linhas,
				)
		RegrasLancamento._validar_contas_ativas(
				linhas,
				)
		RegrasLancamento._validar_valores_positivos(
				linhas,
				)
		RegrasLancamento._validar_balanceamento(
				linhas,
				)
	
	# -----------------------------------------------------
	# 1️⃣ Mínimo 2 linhas
	# -----------------------------------------------------
	
	@staticmethod
	def _validar_minimo_linhas(
			linhas: List[LinhaDominio],
			):
		
		if (
				len(
						linhas,
						)
				< 2
		):
			raise LancamentoSemLinhasSuficientesErro(
					"Lançamento deve possuir no mínimo duas linhas.",
					)
	
	# -----------------------------------------------------
	# 2️⃣ Contas ativas
	# -----------------------------------------------------
	
	@staticmethod
	def _validar_contas_ativas(
			linhas: List[LinhaDominio],
			):
		
		for linha in linhas:
			if not linha.conta_ativa:
				raise ContaInativaErro(
						f"Conta {linha.conta_id} está inativa.",
						)
	
	# -----------------------------------------------------
	# 3️⃣ Valores > 0
	# -----------------------------------------------------
	
	@staticmethod
	def _validar_valores_positivos(
			linhas: List[LinhaDominio],
			):
		
		for linha in linhas:
			if linha.valor.valor <= Decimal(
					"0.00",
					):
				raise ValueError(
						f"Valor inválido na conta {linha.conta_id}.",
						)
	
	# -----------------------------------------------------
	# 4️⃣ Balanceamento
	# -----------------------------------------------------
	
	@staticmethod
	def _validar_balanceamento(
			linhas: List[LinhaDominio],
			):
		
		total_debito = Decimal(
				"0.00",
				)
		total_credito = Decimal(
				"0.00",
				)
		
		for linha in linhas:
			
			if linha.natureza.tipo == "D":
				total_debito += linha.valor.valor
			else:
				total_credito += linha.valor.valor
		
		if total_debito != total_credito:
			raise PartidasDesbalanceadasErro(
					f"Débitos ({total_debito}) "
					f"diferem de créditos ("
					f"{total_credito}).",
					)
