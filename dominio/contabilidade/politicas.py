from django.core.exceptions import ValidationError
from django.utils import timezone


class PoliticaLedger:
	
	# =========================================================
	# REVERSÃO
	# =========================================================
	
	@staticmethod
	def pode_reverter(
			entry,
			):
		"""
		Verifica se um LedgerEntry pode ser revertido.
		"""
		
		if entry.revertido:
			raise ValidationError(
					"Este lançamento já foi revertido.",
					)
		
		if entry.reverso_de_id:
			raise ValidationError(
					"Não é permitido reverter uma reversão.",
					)
		
		if PoliticaLedger._periodo_fechado(
				entry,
				):
			raise ValidationError(
					"Período contábil fechado. Reversão bloqueada.",
					)
		
		return True
	
	# =========================================================
	# IMUTABILIDADE
	# =========================================================
	
	@staticmethod
	def pode_alterar(
			entry,
			):
		"""
		LedgerEntry nunca pode ser alterado.
		"""
		raise ValidationError(
				"LedgerEntry é imutável.",
				)
	
	@staticmethod
	def pode_deletar(
			entry,
			):
		"""
		LedgerEntry nunca pode ser removido.
		"""
		raise ValidationError(
				"LedgerEntry não pode ser removido.",
				)
	
	# =========================================================
	# CONTA
	# =========================================================
	
	@staticmethod
	def pode_alterar_tipo_conta(
			conta,
			):
		"""
		Tipo de conta não pode mudar se houver movimentação.
		"""
		
		if conta.tem_movimentacao():
			raise ValidationError(
					"Não é permitido alterar tipo de conta com histórico.",
					)
		
		return True
	
	@staticmethod
	def pode_desativar_conta(
			conta,
			):
		"""
		Conta não pode ser desativada se tiver saldo ≠ 0
		"""
		
		if hasattr(
				conta,
				"saldo",
				):
			if conta.saldo.saldo_atual != 0:
				raise ValidationError(
						"Conta com saldo diferente de zero não pode ser "
						"desativada.",
						)
		
		return True
	
	# =========================================================
	# MOVIMENTAÇÃO
	# =========================================================
	
	@staticmethod
	def validar_partidas_balanceadas(
			total_debito,
			total_credito,
			):
		
		if total_debito != total_credito:
			raise ValidationError(
					"Partidas desbalanceadas.",
					)
	
	@staticmethod
	def validar_minimo_linhas(
			qtd_linhas,
			):
		
		if qtd_linhas < 2:
			raise ValidationError(
					"Lançamento deve possuir no mínimo duas linhas.",
					)
	
	# =========================================================
	# SEGURANÇA TEMPORAL
	# =========================================================
	
	@staticmethod
	def _periodo_fechado(
			entry,
			):
		"""
		Exemplo simples: bloquear lançamentos com mais de 90 dias.
		Pode ser substituído por modelo real de fechamento mensal.
		"""
		
		hoje = timezone.localdate()
		delta = (hoje - entry.data_contabil).days
		
		if delta > 90:
			return True
		
		return False
	
	# =========================================================
	# MULTI-TENANT
	# =========================================================
	
	@staticmethod
	def validar_inquilino(
			entry,
			inquilino,
			):
		
		if entry.inquilino_id != inquilino.id:
			raise ValidationError(
					"Operação não autorizada para este inquilino.",
					)
		
		return True
