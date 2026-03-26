from django.db import models

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import CoreModel


class NursingEvolution(TenantPropagationMixin, CoreModel):
    """
    Evolução clínica observada pela enfermagem.
    """

    tenant_source = "patient"
    prefix = "EVO"

    patient = models.ForeignKey(

        "clinical.Patient",

        db_column="patient_id",
        on_delete=models.CASCADE,
        related_name="evolucoes_enfermagem",
    )

    observation = models.TextField(

        db_column="observation",

        verbose_name="Evolução clínica")

    evolution_date = models.DateTimeField(

        db_column="evolution_date",

        auto_now_add=True, verbose_name="Data da evolução")

    class Meta:
        db_table = "enfermagem_evolucaoenfermagem"
        verbose_name = "Evolução de Enfermagem"
        verbose_name_plural = "Evoluções de Enfermagem"
        ordering = ["-evolution_date"]

    def __str__(self):
        return f"Evolução - {self.patient}"
