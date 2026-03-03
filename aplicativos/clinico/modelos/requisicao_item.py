# LOCAL: aplicativos/clinico/modelos/requisicao_item.py

from django.core.exceptions import ValidationError
from django.db import models, transaction

from dominio.clinico.estado_requisicao import EstadoRequisicao
from nucleo.modelos.base import NoNameCoreModel
from .exame import Exame
from .resultado_analise import ResultadoItem


class _RequisicaoItemManager(models.Manager) :
	"""
	Manager privado.
	Impede criação direta via ORM.
	"""
	
	def create(self, *args, **kwargs) :
		raise ValidationError("RequisicaoItem deve ser criado via RequisicaoAnalise.adicionar_exame().")


class RequisicaoItem(NoNameCoreModel) :
	prefixo = "REQI"
	
	requisicao = models.ForeignKey("clinico.RequisicaoAnalise", on_delete = models.CASCADE, related_name = "itens", )
	
	exame = models.ForeignKey(Exame, on_delete = models.PROTECT, )
	
	objects = _RequisicaoItemManager()
	all_objects = models.Manager()
	
	class Meta :
		ordering = ["id"]
		constraints = [models.UniqueConstraint(fields = ["requisicao", "exame"], name = "uniq_requisicao_exame", )]
		indexes = [models.Index(fields = ["requisicao"]), models.Index(fields = ["exame"]), ]
	
	# =====================================================
	# IMUTÁVEL APÓS CRIAÇÃO
	# =====================================================
	
	def save(self, *args, **kwargs) :
		if self.pk :
			raise ValidationError("RequisicaoItem é imutável após criação.")
		
		if self.requisicao.estado != EstadoRequisicao.CRIADA :
			raise ValidationError("Só é possível adicionar exames quando a requisição está em estado CRIADA.")
		
		with transaction.atomic() :
			super().save(*args, **kwargs)
			self._criar_resultados()
	
	# =====================================================
	# GERA RESULTADOS AUTOMATICAMENTE
	# =====================================================
	
	def _criar_resultados(self) :
		"""
		Cria automaticamente os ResultadoItem
		herdando o inquilino do agregado raiz.
		"""
		
		campos = self.exame.campos.all()
		
		if not campos.exists() :
			return
		
		inquilino = self.requisicao.inquilino
		
		resultados = [ResultadoItem(inquilino = inquilino, requisicao = self.requisicao, exame_campo = campo, ) for campo in campos]
		
		ResultadoItem.objects.bulk_create(resultados)
	
	# =====================================================
	
	def delete(self, *args, **kwargs) :
		raise ValidationError("RequisicaoItem não pode ser removido.")
	
	def __str__(self) :
		return self.exame.nome