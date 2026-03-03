# LOCAL: aplicativos/clinico/modelos/resultado_item.py

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from dominio.clinico.estado_resultado import EstadoResultado
from dominio.clinico.eventos import ResultadoValidadoEvent
from dominio.clinico.servico_resultado import ServicoResultado
from dominio.clinico.state_machine_resultado import ResultadoStateMachine
from eventos.bus import event_bus
from nucleo.modelos.base import NoNameCoreModel
from .exame_campo import ExameCampo
from .requisicao_analise import RequisicaoAnalise

User = settings.AUTH_USER_MODEL


class ResultadoItem(NoNameCoreModel) :
	prefixo = "RES"
	
	requisicao = models.ForeignKey(RequisicaoAnalise, on_delete = models.CASCADE, related_name = "resultados", )
	
	exame_campo = models.ForeignKey(ExameCampo, on_delete = models.CASCADE, related_name = "resultados", )
	
	resultado = models.CharField(max_length = 120, blank = True, null = True, )
	
	status_clinico = models.CharField(max_length = 20, blank = True, )
	
	cor_laudo = models.CharField(max_length = 20, blank = True, )
	
	alerta_critico = models.BooleanField(default = False, )
	
	estado = models.CharField(max_length = 30, choices = EstadoResultado.CHOICES, default = EstadoResultado.PENDENTE, db_index = True, )
	
	validado_por = models.ForeignKey(User, on_delete = models.SET_NULL, null = True, blank = True, related_name = "resultados_validados", )
	
	data_validacao = models.DateTimeField(null = True, blank = True, )
	
	class Meta :
		unique_together = ("requisicao", "exame_campo")
	
	# =====================================================
	# PROTEÇÃO ESTADO TERMINAL
	# =====================================================
	
	def _verificar_estado_terminal(self) :
		if not self.pk :
			return
		
		original = (self.__class__.all_objects.filter(pk = self.pk).only("estado").first())
		
		if original and original.estado in EstadoResultado.TERMINAIS :
			raise ValidationError("Resultado em estado final é imutável.")
	
	# =====================================================
	# WRITE-ONCE DO RESULTADO
	# =====================================================
	
	def _verificar_write_once(self) :
		if not self.pk :
			return
		
		original = (self.__class__.all_objects.filter(pk = self.pk).only("resultado").first())
		
		if original and original.resultado is not None and self.resultado != original.resultado :
			raise ValidationError("Valor do resultado não pode ser alterado após inserção.")
	
	# =====================================================
	# SAVE CONTROLADO
	# =====================================================
	
	def save(self, *args, **kwargs) :
		self._verificar_estado_terminal()
		self._verificar_write_once()
		
		# Interpretação automática enquanto não validado
		if self.estado != EstadoResultado.VALIDADO :
			ServicoResultado.interpretar(self)
		
		super().save(*args, **kwargs)
		
		# Sincroniza status clínico global
		self.requisicao.atualizar_status_clinico()
	
	# =====================================================
	# DELETE PROTEGIDO
	# =====================================================
	
	def delete(self, *args, **kwargs) :
		if self.estado in EstadoResultado.TERMINAIS :
			raise ValidationError("Resultado validado não pode ser removido.")
		
		super().delete(*args, **kwargs)
	
	# =====================================================
	# TRANSIÇÃO CONTROLADA
	# =====================================================
	
	def transicionar(self, novo_estado, usuario = None) :
		ResultadoStateMachine.validar_transicao(self.estado, novo_estado, )
		
		if novo_estado in EstadoResultado.TERMINAIS :
			self._verificar_estado_terminal()
		
		if novo_estado == EstadoResultado.VALIDADO :
			if not self.resultado :
				raise ValidationError("Não é possível validar resultado vazio.")
			
			self.validado_por = usuario
			self.data_validacao = timezone.now()
			
			# Interpretação final obrigatória
			ServicoResultado.interpretar(self)
		
		self.estado = novo_estado
		
		self.save(update_fields = ["estado", "validado_por", "data_validacao", "status_clinico", "cor_laudo", "alerta_critico", "resultado", ])
		
		# Evento após commit
		if novo_estado == EstadoResultado.VALIDADO :
			event_bus.publish_after_commit(ResultadoValidadoEvent(resultado_id = self.id, ))
	
	# =====================================================
	
	def __str__(self) :
		return f"{self.id_custom} - {self.exame_campo.nome}"