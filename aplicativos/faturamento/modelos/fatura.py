# faturamento/models/fatura.py

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum

from aplicativos.clinico.modelos.paciente import Paciente
from aplicativos.clinico.modelos.requisicao_analise import RequisicaoAnalise
from nucleo.modelos.base import NoNameCoreModel


class Fatura(NoNameCoreModel) :
	prefixo = "FAT"
	
	class Estado(models.TextChoices) :
		RASCUNHO = "RASC", "Rascunho"
		EMITIDA = "EMIT", "Emitida"
		PAGA = "PAGA", "Paga"
		CANCELADA = "CANC", "Cancelada"
	
	requisicao = models.OneToOneField(RequisicaoAnalise, on_delete = models.CASCADE, related_name = "fatura", )
	
	paciente = models.ForeignKey(Paciente, on_delete = models.PROTECT, related_name = "faturas", )
	
	subtotal = models.DecimalField(max_digits = 12, decimal_places = 2, default = 0)
	iva_valor = models.DecimalField(max_digits = 12, decimal_places = 2, default = 0)
	total = models.DecimalField(max_digits = 12, decimal_places = 2, default = 0)
	
	valor_seguro = models.DecimalField(max_digits = 12, decimal_places = 2, default = 0)
	valor_paciente = models.DecimalField(max_digits = 12, decimal_places = 2, default = 0)
	
	estado = models.CharField(max_length = 5, choices = Estado.choices, default = Estado.RASCUNHO, db_index = True, )
	
	# ==========================================
	# RECÁLCULO FINANCEIRO
	# ==========================================
	
	def recalcular_totais(self) :
		subtotal = (self.itens.aggregate(total = Sum("total"))["total"] or Decimal("0.00"))
		
		iva = subtotal * Decimal("0.16")  # 16% exemplo
		total = subtotal + iva
		
		self.subtotal = subtotal
		self.iva_valor = iva
		self.total = total
		self.valor_paciente = total - self.valor_seguro
	
	# ==========================================
	# EMISSÃO
	# ==========================================
	
	def emitir(self) :
		if self.estado != self.Estado.RASCUNHO :
			raise ValidationError("Somente faturas em rascunho podem ser emitidas.")
		
		if not self.itens.exists() :
			raise ValidationError("Fatura sem itens.")
		
		self.recalcular_totais()
		self.estado = self.Estado.EMITIDA
		self.save()
	
	# ==========================================
	# BLOQUEIO DE ALTERAÇÃO
	# ==========================================
	
	def clean(self) :
		if self.pk :
			original = Fatura.objects.get(pk = self.pk)
			if original.estado != self.Estado.RASCUNHO :
				raise ValidationError("Fatura já emitida não pode ser alterada.")
	
	def __str__(self) :
		return f"{self.id_custom} - {self.paciente.nome}"