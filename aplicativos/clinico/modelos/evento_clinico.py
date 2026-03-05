from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from nucleo.constantes.tipo_evento_clinico import TipoEventoClinico
from nucleo.modelos.base import CoreModel
from .paciente import Paciente
from .requisicao_analise import RequisicaoAnalise
from .resultado_analise import ResultadoItem


class EventoClinico(CoreModel) :
	"""
	Registro imutável de eventos clínicos.

	Utilizado para:
	• auditoria clínica
	• histórico médico
	• rastreabilidade laboratorial
	"""
	
	prefixo = "EVT"
	
	paciente = models.ForeignKey(Paciente, on_delete = models.CASCADE, related_name = "eventos_clinicos", )
	
	requisicao = models.ForeignKey(RequisicaoAnalise, on_delete = models.CASCADE, null = True, blank = True, related_name = "eventos_clinicos", )
	
	resultado = models.ForeignKey(ResultadoItem, on_delete = models.CASCADE, null = True, blank = True, related_name = "eventos_clinicos", )
	
	tipo_evento = models.CharField(max_length = 50, choices = TipoEventoClinico.choices, db_index = True, )
	
	descricao = models.TextField()
	
	class Meta :
		ordering = ["-criado_em"]
		
		indexes = [models.Index(fields = ["paciente"]), models.Index(fields = ["tipo_evento"]), models.Index(fields = ["criado_em"]), models.Index(fields = ["requisicao"]), models.Index(fields = ["resultado"]), ]
		
		constraints = [# evento deve ter pelo menos requisicao ou resultado
			models.CheckConstraint(check = (Q(requisicao__isnull = False) | Q(resultado__isnull = False)), name = "evento_clinico_deve_ter_contexto", )]
	
	# =====================================================
	# VALIDAÇÃO DE DOMÍNIO
	# =====================================================
	
	def clean(self) :
		# resultado deve pertencer à requisição
		if self.resultado and self.requisicao :
			if self.resultado.requisicao_id != self.requisicao_id :
				raise ValidationError("Resultado não pertence à requisição informada.")
		
		# paciente deve ser consistente
		if self.requisicao and self.requisicao.paciente_id != self.paciente_id :
			raise ValidationError("Paciente inconsistente com a requisição.")
		
		if self.resultado and self.resultado.requisicao.paciente_id != self.paciente_id :
			raise ValidationError("Paciente inconsistente com o resultado.")
	
	# =====================================================
	# EVENTO É IMUTÁVEL
	# =====================================================
	
	def save(self, *args, **kwargs) :
		if self.pk :
			raise ValidationError("Evento clínico é imutável.")
		
		super().save(*args, **kwargs)
	
	def delete(self, *args, **kwargs) :
		raise ValidationError("Evento clínico não pode ser removido.")
	
	# =====================================================
	
	def __str__(self) :
		return f"{self.tipo_evento} - {self.paciente.nome}"