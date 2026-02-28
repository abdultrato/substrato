from django.db import models
from django.core.exceptions import ValidationError

from infrastrutura.orm.fields.dinheiro_field import DinheiroField
from nucleo.modelos.base import CoreModel


class Pagamento(CoreModel):
	"""
	Aggregate Root de Pagamento.

	Responsável por:
	- Estado do pagamento
	- Transições válidas
	- Integração com a fatura
	"""
	
	class Metodo(models.TextChoices):
		DINHEIRO = "DIN", "Dinheiro"
		CARTAO = "CAR", "Cartão"
		TRANSFERENCIA = "TRF", "Transferência"
		MOBILE_MONEY = "MOB", "Mobile Money"
		POS = "POS", "POS"
		CHEQUE = "CHQ", "Cheque"
		OUTRO = "OUT", "Outro"
	
	class Status(models.TextChoices):
		PENDENTE = "PEN", "Pendente"
		CONFIRMADO = "CON", "Confirmado"
		FALHOU = "FAL", "Falhou"
		ESTORNADO = "EST", "Estornado"
		CANCELADO = "CAN", "Cancelado"
	
	fatura = models.ForeignKey(
			"faturamento.Fatura",
			on_delete = models.PROTECT,
			related_name = "pagamentos",
			)
	
	valor = DinheiroField()
	
	metodo = models.CharField(
			max_length = 4,
			choices = Metodo.choices,
			)
	
	status = models.CharField(
			max_length = 3,
			choices = Status.choices,
			default = Status.PENDENTE,
			db_index = True,
			)
	
	referencia_externa = models.CharField(
			max_length = 120,
			blank = True,
			help_text = "Referência externa (transação, autorização, etc).",
			)
	
	pago_em = models.DateTimeField(
			null = True,
			blank = True,
			)
	
	class Meta:
		ordering = ["-criado_em"]
		indexes = [
				models.Index(fields = ["fatura"]),
				models.Index(fields = ["status"]),
				models.Index(fields = ["criado_em"]),
				]
	
	def __str__(self):
		return f"{self.get_metodo_display()} - {self.valor} ({self.get_status_display()})"
	
	# =========================
	# TRANSIÇÕES DE ESTADO
	# =========================
	
	def confirmar(self):
		if self.status != self.Status.PENDENTE:
			raise ValidationError(
				"Apenas pagamentos pendentes podem ser confirmados."
				)
		
		self.status = self.Status.CONFIRMADO
		self.save(update_fields = ["status"])
		self._atualizar_fatura()
	
	def falhar(self):
		if self.status != self.Status.PENDENTE:
			raise ValidationError("Apenas pagamentos pendentes podem falhar.")
		
		self.status = self.Status.FALHOU
		self.save(update_fields = ["status"])
	
	def estornar(self):
		if self.status != self.Status.CONFIRMADO:
			raise ValidationError(
				"Apenas pagamentos confirmados podem ser estornados."
				)
		
		self.status = self.Status.ESTORNADO
		self.save(update_fields = ["status"])
		self._atualizar_fatura()
	
	def cancelar(self):
		if self.status != self.Status.PENDENTE:
			raise ValidationError(
				"Apenas pagamentos pendentes podem ser cancelados."
				)
		
		self.status = self.Status.CANCELADO
		self.save(update_fields = ["status"])
	
	# =========================
	# INTEGRAÇÃO COM FATURA
	# =========================
	
	def _atualizar_fatura(self):
		if self.fatura_id:
			self.fatura.atualizar_estado_pagamento()
