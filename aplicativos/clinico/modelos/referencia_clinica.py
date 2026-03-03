# LOCAL: aplicativos/clinico/modelos/referencia_clinica.py

from django.db import models

from nucleo.constantes.genero import Genero
from nucleo.modelos.base import CoreModel


class ReferenciaClinica(CoreModel) :
	prefixo = "REF"
	
	exame_campo = models.ForeignKey("ExameCampo", on_delete = models.CASCADE, related_name = "referencias", )
	
	sexo = models.CharField(max_length = 10, choices = Genero.choices, null = True, blank = True, )
	
	idade_minima_dias = models.PositiveIntegerField(null = True, blank = True)
	idade_maxima_dias = models.PositiveIntegerField(null = True, blank = True)
	
	valor_minimo = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True)
	valor_maximo = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True)
	
	critico_baixo = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True)
	critico_alto = models.DecimalField(max_digits = 10, decimal_places = 2, null = True, blank = True)
	
	class Meta :
		indexes = [models.Index(fields = ["sexo"]), models.Index(fields = ["idade_minima_dias", "idade_maxima_dias"]), ]