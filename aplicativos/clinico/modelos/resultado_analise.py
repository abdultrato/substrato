from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from dominio.clinico.estado_resultado import EstadoResultado
from dominio.clinico.eventos import ResultadoValidadoEvent
from dominio.clinico.servico_resultado import ServicoResultado
from dominio.clinico.state_machine_resultado import ResultadoStateMachine
from eventos.bus import event_bus
from nucleo.modelos.base import NoNameCoreModel
from .exame_campo import ExameCampo
from .resultado import Resultado

User = settings.AUTH_USER_MODEL


class ResultadoItem(NoNameCoreModel) :
	prefixo = "RES"
	
	resultado = models.ForeignKey(Resultado, on_delete = models.CASCADE, related_name = "itens", )
	
	exame_campo = models.ForeignKey(ExameCampo, on_delete = models.CASCADE, related_name = "resultados", )
	
	resultado_valor = models.CharField(max_length = 120, blank = True, null = True)
	
	status_clinico = models.CharField(max_length = 20, blank = True, )
	
	cor_laudo = models.CharField(max_length = 20, blank = True, )
	
	alerta_critico = models.BooleanField(default = False, )
	
	estado = models.CharField(max_length = 30, choices = EstadoResultado.CHOICES, default = EstadoResultado.PENDENTE, db_index = True, )
	
	validado_por = models.ForeignKey(User, on_delete = models.SET_NULL, null = True, blank = True, related_name = "resultados_validados", )
	
	data_validacao = models.DateTimeField(null = True, blank = True, )
	
	class Meta :
		unique_together = ("resultado", "exame_campo")
	
	# =====================================================
	# CONSULTA ORIGINAL
	# =====================================================
	
	def _original(self) :
		if not self.pk :
			return None
		
		return self.__class__.all_objects.filter(pk = self.pk).only("estado", "resultado_valor").first()
	
	# =====================================================
	# PROTEÇÃO ESTADO TERMINAL
	# =====================================================
	
	def _verificar_estado_terminal(self, original) :
		if original and original.estado in EstadoResultado.TERMINAIS :
			raise ValidationError("Resultado em estado final é imutável.")
	
	# =====================================================
	# WRITE-ONCE DO RESULTADO
	# =====================================================
	
	def _verificar_write_once(self, original) :
		if not original :
			return
		
		if original.resultado_valor is not None and self.resultado_valor != original.resultado_valor :
			raise ValidationError("Valor do resultado não pode ser alterado após inserção.")
	
	# =====================================================
	# SAVE CONTROLADO
	# =====================================================
	
	def save(self, *args, **kwargs) :
		# propagação automática do tenant
		if not self.inquilino and self.resultado :
			self.inquilino = self.resultado.inquilino
		
		valor_anterior = None
		
		if self.pk :
			valor_anterior = (self.__class__.all_objects.filter(pk = self.pk).values_list("resultado_valor", flat = True).first())
		
		valor_alterado = valor_anterior != self.resultado_valor
		
		# interpreta apenas se valor mudou
		if valor_alterado and self.estado != "VALIDADO" :
			from dominio.clinico.servico_resultado import ServicoResultado
			ServicoResultado.interpretar(self)
		
		super().save(*args, **kwargs)
		
		# atualiza status da requisição
		if self.resultado :
			self.resultado.requisicao.atualizar_status_clinico()
	
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
		with transaction.atomic() :
			resultado = (ResultadoItem.all_objects.select_for_update().get(pk = self.pk))
			
			ResultadoStateMachine.validar_transicao(resultado.estado, novo_estado, )
			
			if novo_estado == EstadoResultado.VALIDADO :
				if not resultado.resultado_valor :
					raise ValidationError("Não é possível validar resultado vazio.")
				
				resultado.validado_por = usuario
				resultado.data_validacao = timezone.now()
				
				# interpretação final obrigatória
				ServicoResultado.interpretar(resultado)
			
			resultado.estado = novo_estado
			
			resultado.save(update_fields = ["estado", "validado_por", "data_validacao", "status_clinico", "cor_laudo", "alerta_critico", "resultado_valor", ])
		
		# evento publicado após commit
		if novo_estado == EstadoResultado.VALIDADO :
			event_bus.publish_after_commit(ResultadoValidadoEvent(resultado_id = self.id))
	
	# =====================================================
	
	def __str__(self) :
		return f"{self.id_custom} - {self.exame_campo.nome}"