from django.db import models

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import CoreModel


class NursingPrescription(PropagarInquilinoMixin, CoreModel):
    """
    Prescrição de cuidados de enfermagem para um paciente.
    """

    fonte_inquilino = "paciente"
    prefixo = "PRE"

    paciente = models.ForeignKey(
        "clinico.Patient",
        on_delete=models.CASCADE,
        related_name="prescricoes_enfermagem",
    )

    descricao = models.TextField(verbose_name="Descrição da prescrição")

    data_prescricao = models.DateTimeField(auto_now_add=True, verbose_name="Data da prescrição")

    ativo = models.BooleanField(default=True, verbose_name="Prescrição ativa")

    class Meta:
        verbose_name = "Prescrição de Enfermagem"
        verbose_name_plural = "Prescrições de Enfermagem"
        ordering = ["-data_prescricao"]

    def __str__(self):
        return f"Prescrição - {self.paciente}"
