from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import (models, transaction, )

from nucleo.modelos.base import CoreModel


class Movimento(CoreModel, ) :
	prefixo = "MV"
	
	lancamento = models.ForeignKey("contabilidade.Lancamento", on_delete = models.CASCADE, related_name = "movimentos", db_index = True, )
	
	conta = models.ForeignKey("contabilidade.Conta", on_delete = models.PROTECT, related_name = "movimentos", db_index = True, )
	
	debito = models.DecimalField(max_digits = 14, decimal_places = 2, default = Decimal("0.00", ), )
	
	credito = models.DecimalField(max_digits = 14, decimal_places = 2, default = Decimal("0.00", ), )
	
	class Meta :
		indexes = [models.Index(fields = ["inquilino", "lancamento", ], ), models.Index(fields = ["conta", ], ), ]
	
	def clean(self, ) :
		if self.debito > 0 and self.credito > 0 :
			raise ValidationError("Não pode ter débito e crédito.", )
		
		if self.debito == 0 and self.credito == 0 :
			raise ValidationError("Movimento deve ter débito ou crédito.", )
		
		if not self.lancamento_id :
			raise ValidationError({"lancamento" : "Obrigatório.", }, )
		
		if not self.conta_id :
			raise ValidationError({"conta" : "Obrigatório.", }, )
		
		# 🔒 Carregar lançamento com lock se existir
		if self.lancamento_id :
			lancamento = (type(self.lancamento, ).objects.select_for_update().get(pk = self.lancamento_id, ))
			
			if lancamento.confirmado :
				raise ValidationError("Lançamento já confirmado.", )
			
			if lancamento.inquilino_id != self.inquilino_id :
				raise ValidationError("Inquilino diferente do lançamento.", )
		
		if self.conta_id :
			if self.conta.inquilino_id != self.inquilino_id :
				raise ValidationError("Inquilino diferente da conta.", )
	
	@transaction.atomic
	def save(self, *args, **kwargs, ) :
		self.full_clean()
		return super().save(*args, **kwargs, )
	
	def delete(self, *args, **kwargs, ) :
		if self.lancamento.confirmado :
			raise ValidationError("Não pode remover movimento confirmado.", )
		return super().delete(*args, **kwargs, )
	
	def __str__(self, ) :
		return f"{self.conta} D:{self.debito} C:{self.credito}"