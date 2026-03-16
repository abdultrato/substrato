from django.db import models

from nucleo.mixins.tenant_propagation import PropagarInquilinoMixin
from nucleo.modelos.base import CoreModel


class EvolucaoEnfermagem(PropagarInquilinoMixin, CoreModel):
    """
    Evolução clínica observada pela enfermagem.
    """

    fonte_inquilino = "paciente"
    prefixo = "EVO"

    paciente = models.ForeignKey(
        "clinico.Paciente",
        on_delete=models.CASCADE,
        related_name="evolucoes_enfermagem",
    )

    observacao = models.TextField(verbose_name="Evolução clínica")

    data_evolucao = models.DateTimeField(auto_now_add=True, verbose_name="Data da evolução")

    class Meta:
        verbose_name = "Evolução de Enfermagem"
        verbose_name_plural = "Evoluções de Enfermagem"
        ordering = ["-data_evolucao"]

    def __str__(self):
        return f"Evolução - {self.paciente}"
