# LOCAL: aplicativos/clinico/modelos/requisicao_analise.py

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction

from dominio.clinico.estado_requisicao import EstadoRequisicao
from dominio.clinico.state_machine_requisicao import RequisicaoStateMachine
from nucleo.modelos.base import CoreModel
from .exame import Exame
from .paciente import Paciente

User = settings.AUTH_USER_MODEL


class RequisicaoAnalise(CoreModel) :
	prefixo = "REQ"
	
	paciente = models.ForeignKey(Paciente, on_delete = models.CASCADE, related_name = "requisicoes", )
	
	exames = models.ManyToManyField(Exame, through = "RequisicaoItem", related_name = "requisicoes", )
	
	analista = models.ForeignKey(User, on_delete = models.SET_NULL, null = True, blank = True, related_name = "requisicoes_processadas", )
	
	estado = models.CharField(max_length = 30, choices = EstadoRequisicao.CHOICES, default = EstadoRequisicao.CRIADA, db_index = True, )
	
	status_clinico = models.CharField(max_length = 10, default = "normal", db_index = True, )
	
	possui_resultado_critico = models.BooleanField(default = False, db_index = True, )
	
	class Meta :
		ordering = ["-criado_em"]
	
	# =====================================================
	# INVARIANTES
	# =====================================================
	
	def _esta_editavel(self) :
		return self.estado == EstadoRequisicao.CRIADA
	
	def _verificar_estado_terminal(self) :
		if not self.pk :
			return
		
		original = (self.__class__.all_objects.filter(pk = self.pk).only("estado").first())
		
		if original and original.estado in EstadoRequisicao.TERMINAIS :
			raise ValidationError("Requisição finalizada é imutável.")
	
	# =====================================================
	# SAVE CONTROLADO
	# =====================================================
	
	def save(self, *args, **kwargs) :
		self._verificar_estado_terminal()
		super().save(*args, **kwargs)
	
	# =====================================================
	# AGGREGATE ROOT
	# =====================================================
	
	def adicionar_exame(self, exame: Exame) :
		if not self._esta_editavel() :
			raise ValidationError("Não é possível adicionar exames após início do processamento.")
		
		if self.itens.filter(exame = exame).exists() :
			raise ValidationError("Exame já adicionado à requisição.")
		
		from .requisicao_item import RequisicaoItem
		
		with transaction.atomic() :
			return RequisicaoItem.all_objects.create(requisicao = self, exame = exame, )
	
	# =====================================================
	# TRANSIÇÃO
	# =====================================================
	
	def transicionar(self, novo_estado) :
		RequisicaoStateMachine.validar_transicao(self.estado, novo_estado, )
		
		self.estado = novo_estado
		self.save(update_fields = ["estado"])
	
	# =====================================================
	# SINCRONIZAÇÃO CLÍNICA
	# =====================================================
	
	def atualizar_status_clinico(self) :
		resultados = self.resultados.all()
		
		if not resultados.exists() :
			self.status_clinico = "normal"
			self.possui_resultado_critico = False
		else :
			possui_critico = resultados.filter(alerta_critico = True).exists()
			
			self.possui_resultado_critico = possui_critico
			
			if possui_critico :
				self.status_clinico = "critico"
			else :
				possui_alerta = resultados.filter(status_clinico__in = ["alto", "baixo"]).exists()
				
				self.status_clinico = ("alerta" if possui_alerta else "normal")
		
		self.save(update_fields = ["status_clinico", "possui_resultado_critico", ])
		
		self._auto_validar_se_necessario()
	
	# =====================================================
	# AUTO-TRANSIÇÃO PARA VALIDADA
	# =====================================================
	
	def _auto_validar_se_necessario(self) :
		if self.estado != EstadoRequisicao.AGUARDANDO_VALIDACAO :
			return
		
		total = self.resultados.count()
		
		if total == 0 :
			return
		
		validados = self.resultados.filter(estado = "VALIDADO").count()
		
		if validados == total :
			self.transicionar(EstadoRequisicao.VALIDADA)
	
	# =====================================================
	
	def __str__(self) :
		return f"{self.id_custom} - {self.paciente.nome}"