# LOCAL: aplicativos/clinico/modelos/exame_campo.py

from django.db import models

from nucleo.modelos.base import CoreModel
from .exame import Exame


class ExameCampo(CoreModel) :
	prefixo = "CMP"
	
	exame = models.ForeignKey(Exame, on_delete = models.CASCADE, related_name = "campos", )
	
	tipo = models.CharField(max_length = 20)
	
	unidade = models.CharField(max_length = 20)
	
	def __str__(self) :
		return f"{self.exame.nome} → {self.nome}"