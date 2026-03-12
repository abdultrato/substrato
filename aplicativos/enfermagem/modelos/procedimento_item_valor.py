from decimal import Decimal

from django.db import models

from infrastrutura.orm.fields.dinheiro_field import DinheiroField
from nucleo.mixins.tenant_propagation import PropagarInquilinoMixin
from nucleo.modelos.base import NoNameCoreModel


class ProcedimentoItemValor(PropagarInquilinoMixin, NoNameCoreModel):
	"""
	Valor unitário efetivo de um item de procedimento.
	"""
	
	fonte_inquilino = "item"
	prefixo = "PIV"
	
	item = models.OneToOneField(
			"enfermagem.ProcedimentoItem",
			on_delete=models.CASCADE,
			related_name="valor",
			db_index=True,
			)
	
	preco_unitario = DinheiroField(
			default=Decimal("0.00"),
			)
	
	ativo = models.BooleanField(
			default=True,
			db_index=True,
			)
	
	class Meta:
		verbose_name = "Valor do Item de Procedimento"
		verbose_name_plural = "Valores dos Itens de Procedimento"
		ordering = ["-criado_em"]
	
	def __str__(self):
		return f"{self.item_id} - {self.preco_unitario}"
