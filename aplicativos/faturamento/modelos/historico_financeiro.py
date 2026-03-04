from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import CoreModel
from .fatura import Fatura


class HistoricoFinanceiro(CoreModel) :
	prefixo = "HF"
	
	ORIGENS = (("sistema", "Sistema"), ("usuario", "Usuário"), ("gateway", "Gateway"), ("banco", "Banco"), ("api", "API Externa"),)
	
	fatura = models.ForeignKey(Fatura, on_delete = models.CASCADE, related_name = "historico", )
	
	tipo_evento = models.CharField(max_length = 50, db_index = True)
	
	descricao = models.CharField(max_length = 255)
	
	valor = models.DecimalField(max_digits = 12, decimal_places = 2, null = True, blank = True, )
	
	referencia_externa = models.CharField(max_length = 120, blank = True)
	
	usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null = True, blank = True, on_delete = models.SET_NULL, )
	
	origem = models.CharField(max_length = 80, choices = ORIGENS, default = "sistema", )
	
	ip_origem = models.GenericIPAddressField(null = True, blank = True)
	
	class Meta :
		ordering = ["-criado_em"]
	
	def save(self, *args, **kwargs) :
		if self.pk :
			raise ValidationError("Histórico financeiro é imutável.")
		super().save(*args, **kwargs)
	
	def delete(self, *args, **kwargs) :
		raise ValidationError("Histórico financeiro não pode ser removido.")