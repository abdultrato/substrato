from django.db import models

from nucleo.modelos.base import NoNameCoreModel
from .exame import Exame
from .resultado import Resultado
from .resultado_analise import ResultadoItem


class RequisicaoItem(NoNameCoreModel) :
	requisicao = models.ForeignKey("RequisicaoAnalise", on_delete = models.CASCADE, related_name = "itens", )
	
	exame = models.ForeignKey(Exame, on_delete = models.PROTECT, related_name = "requisicoes", )
	
	class Meta :
		unique_together = ("requisicao", "exame")
	
	# -----------------------------------------------------
	
	def save(self, *args, **kwargs) :
		criando = self.pk is None
		
		if not self.inquilino :
			self.inquilino = self.requisicao.inquilino
		
		super().save(*args, **kwargs)
		
		if criando :
			self._criar_resultados()
	
	# -----------------------------------------------------
	
	def _criar_resultados(self) :
		requisicao = self.requisicao
		inquilino = requisicao.inquilino
		
		# garante que exista um resultado para a requisição
		resultado, _ = Resultado.objects.get_or_create(requisicao = requisicao, defaults = {"inquilino" : inquilino}, )
		
		campos = self.exame.campos.all()
		
		itens = []
		
		for campo in campos :
			# evita duplicação
			if ResultadoItem.objects.filter(resultado = resultado, exame_campo = campo, ).exists() :
				continue
			
			itens.append(ResultadoItem(resultado = resultado, exame_campo = campo, inquilino = inquilino, ))
		
		if itens :
			ResultadoItem.objects.bulk_create(itens)
	
	# -----------------------------------------------------
	
	def __str__(self) :
		return f"{self.requisicao.id_custom} - {self.exame.nome}"