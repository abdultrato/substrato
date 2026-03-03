# LOCAL: aplicativos/clinico/modelos/evento_clinico.py

from django.core.exceptions import ValidationError
from django.db import models

from nucleo.constantes.tipo_evento_clinico import TipoEventoClinico
from nucleo.modelos.base import CoreModel
from .paciente import Paciente
from .requisicao_analise import RequisicaoAnalise
from .resultado_analise import ResultadoItem


class EventoClinico(CoreModel) :
	prefixo = "EVT"
	
	paciente = models.ForeignKey(Paciente, on_delete = models.CASCADE, related_name = "eventos_clinicos", )
	
	requisicao = models.ForeignKey(RequisicaoAnalise, on_delete = models.CASCADE, null = True, blank = True, related_name = "eventos_clinicos", )
	
	resultado = models.ForeignKey(ResultadoItem, on_delete = models.CASCADE, null = True, blank = True, related_name = "eventos_clinicos", )
	
	tipo_evento = models.CharField(max_length = 50, choices = TipoEventoClinico.choices, db_index = True, )
	
	descricao = models.TextField()
	
	class Meta :
		ordering = ["-criado_em"]
		indexes = [models.Index(fields = ["tipo_evento"]), models.Index(fields = ["paciente"]), ]
	
	# 🔒 Evento é imutável
	def save(self, *args, **kwargs) :
		if self.pk :
			raise ValidationError("Evento clínico é imutável.")
		super().save(*args, **kwargs)
	
	def delete(self, *args, **kwargs) :
		raise ValidationError("Evento clínico não pode ser removido.")
	
	def __str__(self) :
		return f"{self.tipo_evento} - {self.paciente.nome}"