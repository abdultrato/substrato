# faturamento/models/fatura_item.py

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import NoNameCoreModel


class FaturaItem(NoNameCoreModel) :
	fatura = models.ForeignKey("faturamento.Fatura", on_delete = models.CASCADE, related_name = "itens", )
	
	exame = models.ForeignKey("clinico.Exame", on_delete = models.PROTECT, )
	
	descricao = models.CharField(max_length = 200, blank = True)
	
	quantidade = models.DecimalField(max_digits = 10, decimal_places = 2, default = Decimal("1.00"), )
	
	preco_unitario = models.DecimalField(max_digits = 12, decimal_places = 2, null = True, blank = True)
	
	class Meta :
		unique_together = ("fatura", "exame")
	
	@property
	def total(self) :
		return self.preco_unitario * self.quantidade
	
	def save(self, *args, **kwargs) :
		if self.fatura.estado != self.fatura.Estado.RASCUNHO :
			raise ValidationError("Não é permitido alterar itens de fatura emitida.")
		
		if not self.pk :
			self.preco_unitario = self.exame.preco
		
		super().save(*args, **kwargs)
	
	def delete(self, *args, **kwargs) :
		if self.fatura.estado != self.fatura.Estado.RASCUNHO :
			raise ValidationError("Não é permitido remover itens.")
		super().delete(*args, **kwargs)