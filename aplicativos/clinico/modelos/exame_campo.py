# LOCAL: aplicativos/clinico/modelos/exame_campo.py
from django.db import models

from nucleo.constantes.laboratorio.tipo_resultado import TipoResultado
from nucleo.constantes.laboratorio.unidades import UnidadePadrao
from nucleo.modelos.base import CoreModel
from .exame import Exame


class ExameCampo(CoreModel) :
	prefixo = "CMP"
	
	exame = models.ForeignKey(Exame, on_delete = models.CASCADE, related_name = "campos", verbose_name = "Exame")
	
	tipo = models.CharField(max_length = 20, choices = TipoResultado.choices, verbose_name = "Tipo de parâmetro")
	
	unidade = models.CharField(verbose_name = "Unidade de medida", max_length = 30, choices = UnidadePadrao.choices, default = UnidadePadrao.P_UL, )
	
	referencia = models.CharField(verbose_name = "Valor de Referência", max_length = 50, null = True, blank = True)
	
	class Meta :
		verbose_name = "parâmetro de cada exame"
		verbose_name_plural = "parâmetros de cada exame"
	
	def __str__(self) :
		return f"{self.exame.nome} → {self.nome}"