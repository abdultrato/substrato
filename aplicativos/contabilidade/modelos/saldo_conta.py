from decimal import Decimal

from django.db import models


class SaldoConta(
		models.Model,
		):
	
	# ===============================
	# RELACIONAMENTO
	# ===============================
	
	conta = models.OneToOneField(
			"contabilidade.Conta",
			on_delete = models.CASCADE,
			related_name = "saldo",
			)
	
	# ===============================
	# PROJEÇÃO FINANCEIRA
	# ===============================
	
	saldo_atual = models.DecimalField(
			max_digits = 18,
			decimal_places = 2,
			default = Decimal(
					"0.00",
					),
			)
	
	# Snapshot opcional para auditoria futura
	total_debitos = models.DecimalField(
			max_digits = 18,
			decimal_places = 2,
			default = Decimal(
					"0.00",
					),
			)
	
	total_creditos = models.DecimalField(
			max_digits = 18,
			decimal_places = 2,
			default = Decimal(
					"0.00",
					),
			)
	
	atualizado_em = models.DateTimeField(
			auto_now = True,
			db_index = True,
			)
	
	# ===============================
	# META
	# ===============================
	
	class Meta:
		indexes = [
				models.Index(
						fields = [
								"atualizado_em",
								],
						),
				models.Index(
						fields = [
								"conta",
								],
						),
				]
		
		constraints = [
				models.UniqueConstraint(
						fields = [
								"conta",
								],
						name = "unique_saldo_por_conta",
						),
				]
	
	# ===============================
	# MÉTODOS UTILITÁRIOS
	# ===============================
	
	def aplicar_debito(
			self,
			valor: Decimal,
			):
		self.total_debitos += valor
		self.saldo_atual += valor
	
	def aplicar_credito(
			self,
			valor: Decimal,
			):
		self.total_creditos += valor
		self.saldo_atual -= valor
	
	def __str__(
			self,
			):
		return f"{self.conta_id} | Saldo: {self.saldo_atual}"
