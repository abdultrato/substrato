from django.db import models

from nucleo.modelos.base import CoreModel
from nucleo.mixins.tenant_propagation import PropagarInquilinoMixin


class RegistroEnfermagem(PropagarInquilinoMixin, CoreModel):
	"""
	Registro de procedimentos ou observações realizadas pela enfermagem.
	"""
	
	fonte_inquilino = "paciente"
	prefixo = "REG"
	
	class Prioridade(models.TextChoices):
		URGENTE = "URG", "Urgente"
		NORMAL = "NOR", "Normal"
		BAIXA = "BAI", "Baixa"
	
	paciente = models.ForeignKey(
			"clinico.Paciente",
			on_delete=models.CASCADE,
			related_name="registros_enfermagem",
			)
	
	prioridade = models.CharField(
			max_length=3,
			choices=Prioridade.choices,
			default=Prioridade.NORMAL,
			db_index=True,
			)
	
	observacao = models.TextField(blank=True, default="")
	
	data_registro = models.DateTimeField(
			auto_now_add=True,
			verbose_name="Data do registro"
			)
	
	class Meta:
		verbose_name = "Registro de Enfermagem"
		verbose_name_plural = "Registros de Enfermagem"
		ordering = ["-data_registro"]
	
	def __str__(self):
		return f"Registro - {self.paciente}"
