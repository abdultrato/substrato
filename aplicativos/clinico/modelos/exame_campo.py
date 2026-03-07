# LOCAL: aplicativos/clinico/modelos/exame_campo.py

from decimal import Decimal

from django.db import models

from nucleo.constantes.laboratorio.tipo_resultado import TipoResultado
from nucleo.constantes.laboratorio.unidades import UnidadePadrao
from nucleo.modelos.base import CoreModel


class ExameCampo(CoreModel) :
	prefixo = "CMP"
	
	exame = models.ForeignKey("clinico.Exame", on_delete = models.CASCADE, related_name = "campos", verbose_name = "Exame", )
	
	tipo = models.CharField(max_length = 20, choices = TipoResultado.choices, verbose_name = "Tipo de parâmetro", )
	
	unidade = models.CharField(max_length = 30, choices = UnidadePadrao.choices, default = UnidadePadrao.P_UL, verbose_name = "Unidade de medida", )
	
	# intervalos normais
	referencia_min = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True, verbose_name = "Referência mínima", )
	
	referencia_max = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True, verbose_name = "Referência máxima", )
	
	# limites críticos
	critico_min = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True, verbose_name = "Valor crítico mínimo", )
	
	critico_max = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True, verbose_name = "Valor crítico máximo", )
	
	# delta check
	delta_max = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True, verbose_name = "Delta máximo permitido", )
	
	class Meta :
		verbose_name = "parâmetro de exame"
		verbose_name_plural = "parâmetros de exame"
	
	def __str__(self) :
		return f"{self.exame.nome} → {self.nome}"
	
	# =====================================================
	# INTERPRETAÇÃO BÁSICA
	# =====================================================
	
	def interpretar_resultado(self, valor) :
		if valor is None :
			return None
		
		try :
			valor = Decimal(valor)
		except Exception :
			return None
		
		# valores críticos
		if self.critico_min is not None and valor < self.critico_min :
			return "CRITICO_BAIXO"
		
		if self.critico_max is not None and valor > self.critico_max :
			return "CRITICO_ALTO"
		
		# intervalo normal
		if self.referencia_min is not None and valor < self.referencia_min :
			return "BAIXO"
		
		if self.referencia_max is not None and valor > self.referencia_max :
			return "ALTO"
		
		return "NORMAL"