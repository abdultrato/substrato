from django.conf import settings
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel
from .exame_campo import ExameCampo
from .requisicao_analise import RequisicaoAnalise

User = settings.AUTH_USER_MODEL


class ResultadoItem(NoNameCoreModel) :
	prefixo = "RES"
	
	requisicao = models.ForeignKey(RequisicaoAnalise, on_delete = models.CASCADE, related_name = "resultados", )
	
	exame_campo = models.ForeignKey(ExameCampo, on_delete = models.CASCADE, related_name = "resultados", )
	
	resultado = models.CharField(max_length = 120, blank = True, null = True, )
	
	# ===============================
	# CAMPOS DERIVADOS (APENAS ARMAZENAMENTO)
	# ===============================
	
	status_clinico = models.CharField(max_length = 20, blank = True)
	cor_laudo = models.CharField(max_length = 20, blank = True)
	
	alerta_critico = models.BooleanField(default = False)
	delta_alerta = models.BooleanField(default = False)
	
	tendencia = models.CharField(max_length = 20, blank = True)
	interpretacao = models.TextField(blank = True)
	
	validado = models.BooleanField(default = False)
	
	validado_por = models.ForeignKey(User, on_delete = models.SET_NULL, null = True, blank = True, related_name = "resultados_validados", )
	
	data_validacao = models.DateTimeField(null = True, blank = True)
	
	class Meta :
		unique_together = ("requisicao", "exame_campo")
		ordering = ["requisicao", "exame_campo"]
	
	def __str__(self) :
		return f"{self.id_custom} - {self.exame_campo.nome}"
	
	def validar(self, usuario) :
		if self.requisicao.status != RequisicaoAnalise.Status.AGUARDANDO_VALIDACAO :
			raise ValueError("Requisição não está pronta para validação.")
		
		self.validado = True
		self.validado_por = usuario
		self.data_validacao = timezone.now()
		
		self.save(update_fields = ["validado", "validado_por", "data_validacao"])