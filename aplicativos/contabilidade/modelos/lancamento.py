from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import (models, transaction, )
from django.db.models import Sum
from django.utils import timezone

from nucleo.modelos.base import CoreModel


class Lancamento(CoreModel, ) :
	prefixo = "LNCM"
	
	descricao = models.CharField(max_length = 255, )
	
	data = models.DateField(db_index = True, default = timezone.localdate, )
	
	referencia_externa = models.CharField(max_length = 120, blank = True, db_index = True, )
	
	confirmado = models.BooleanField(default = False, db_index = True, )
	
	class Meta :
		indexes = [models.Index(fields = ["inquilino", "data", ], ), models.Index(fields = ["confirmado", ], ), ]
	
	# 🔐 Totais apenas informativos (não fonte da verdade)
	def total_debitos(self, ) :
		return self.movimentos.aggregate(total = Sum("debito", ), ).get("total", ) or Decimal("0.00", )
	
	def total_creditos(self, ) :
		return self.movimentos.aggregate(total = Sum("credito", ), ).get("total", ) or Decimal("0.00", )
	
	def validar_partidas(self, ) :
		if self.total_debitos() != self.total_creditos() :
			raise ValidationError("Lançamento desbalanceado.", )
	
	@transaction.atomic
	def confirmar(self, ) :
		# 🔒 Lock pessimista
		lancamento = (Lancamento.objects.select_for_update().prefetch_related("movimentos", ).get(pk = self.pk, ))
		
		if lancamento.confirmado :
			return
		
		if lancamento.movimentos.count() < 2 :
			raise ValidationError("Lançamento deve possuir pelo menos 2 movimentos.", )
		
		lancamento.validar_partidas()
		
		lancamento.confirmado = True
		super(Lancamento, lancamento, ).save(update_fields = ["confirmado", ], )
	
	# 🔐 impedir alteração após confirmado
	def save(self, *args, **kwargs, ) :
		if self.pk :
			original = Lancamento.objects.get(pk = self.pk, )
			
			if original.confirmado :
				raise RuntimeError("Lancamento confirmado é imutável.", )
		
		return super().save(*args, **kwargs, )
	
	def delete(self, *args, **kwargs, ) :
		raise RuntimeError("Lancamento não pode ser removido.", )
	
	def __str__(self, ) :
		codigo = getattr(self, "id_custom", "SEM-CODIGO", )
		return f"{codigo} | {self.data} | {self.descricao}"