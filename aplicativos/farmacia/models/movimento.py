from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Case, F, IntegerField, Sum, When

from nucleo.modelos.base import CoreModel


class TipoMovimento(models.TextChoices) :
	ENTRADA = "ENT", "Entrada"
	SAIDA = "SAI", "Saída"
	AJUSTE = "AJU", "Ajuste"


class MovimentoEstoque(CoreModel) :
	prefixo = "MVESQ"
	
	lote = models.ForeignKey("farmacia.Lote", on_delete = models.PROTECT, related_name = "movimentos", db_index = True, )
	
	tipo = models.CharField(max_length = 3, choices = TipoMovimento.choices, db_index = True, )
	
	quantidade = models.PositiveIntegerField(validators = [MinValueValidator(1)], )
	
	class Meta :
		ordering = ["-criado_em"]
		indexes = [models.Index(fields = ["lote", "criado_em"]), ]
	
	# ======================================
	# VALIDAÇÃO DE DOMÍNIO
	# ======================================
	
	def clean(self) :
		if not self.lote_id :
			raise ValidationError("Lote é obrigatório.")
		
		# Bloquear movimentação de lote vencido
		if self.lote.vencido :
			raise ValidationError("Não é permitido movimentar lote vencido.")
		
		# Multi-tenant enforcement
		if (self.inquilino_id and self.lote.inquilino_id != self.inquilino_id) :
			raise ValidationError("Inquilino do movimento difere do lote.", )
		
		# Bloquear saída sem saldo suficiente
		if self.tipo == TipoMovimento.SAIDA :
			saldo = (self.lote.movimentos.aggregate(total = Sum(Case(When(tipo = TipoMovimento.SAIDA, then = -F("quantidade"), ), default = F("quantidade"), output_field = IntegerField(), ), ), )[
				         "total"] or 0)
			
			if self.quantidade > saldo :
				raise ValidationError("Estoque insuficiente.")
	
	@property
	def quantidade_assinada(self) :
		if self.tipo == TipoMovimento.SAIDA :
			return -self.quantidade
		return self.quantidade
	
	def save(self, *args, **kwargs) :
		self.full_clean()
		return super().save(*args, **kwargs)
	
	def __str__(self) :
		return f"{self.lote} - {self.tipo} ({self.quantidade})"