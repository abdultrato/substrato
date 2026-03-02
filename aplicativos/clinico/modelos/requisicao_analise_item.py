from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import NoNameCoreModel
from .exame import Exame
from .requisicao_analise import RequisicaoAnalise


class RequisicaoItem(NoNameCoreModel) :
	requisicao = models.ForeignKey(RequisicaoAnalise, on_delete = models.CASCADE, related_name = "itens", )
	
	exame = models.ForeignKey(Exame, on_delete = models.PROTECT, )
	
	# 🔥 Snapshot do preço no momento da requisição
	preco_unitario = models.DecimalField(max_digits = 12, decimal_places = 2, )
	
	quantidade = models.DecimalField(max_digits = 10, decimal_places = 2, default = Decimal("1.00"), )
	
	class Meta :
		ordering = ["id"]
		constraints = [models.UniqueConstraint(fields = ["requisicao", "exame"], name = "uniq_requisicao_exame", )]
		indexes = [models.Index(fields = ["requisicao"]), models.Index(fields = ["exame"]), ]
	
	# ==========================================
	# VALIDAÇÃO
	# ==========================================
	
	def clean(self) :
		if self.quantidade <= 0 :
			raise ValidationError("Quantidade deve ser maior que zero.")
		
		if self.preco_unitario < 0 :
			raise ValidationError("Preço unitário não pode ser negativo.")
	
	# ==========================================
	# TOTAL CALCULADO
	# ==========================================
	
	@property
	def total(self) :
		return self.preco_unitario * self.quantidade
	
	# ==========================================
	# AUTO SNAPSHOT DO PREÇO
	# ==========================================
	
	def save(self, *args, **kwargs) :
		if not self.pk :
			# Captura preço atual do exame no momento da criação
			self.preco_unitario = self.exame.preco
		
		self.full_clean()
		super().save(*args, **kwargs)
	
	def __str__(self) :
		return f"{self.exame.nome} ({self.quantidade}x)"