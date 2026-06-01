from django.db import models

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import CoreModel
from .ward import WardScopedModel


class NursingEvolution(TenantPropagationMixin, WardScopedModel, CoreModel):
    """Evolução clínica registrada pela enfermagem."""

    tenant_source = "patient"  # Propaga tenant do paciente
    prefix = "EVO"  # Prefixo custom_id

    patient = models.ForeignKey(  # Paciente acompanhado
        "clinical.Patient",
        verbose_name="Paciente",
        db_column="patient_id",
        on_delete=models.PROTECT,
        related_name="evolucoes_enfermagem",
    )

    observation = models.TextField(  # Texto da evolução
        db_column="observation",
        verbose_name="Evolução clínica",
    )

    evolution_date = models.DateTimeField(  # Timestamp da anotação
        db_column="evolution_date",
        auto_now_add=True,
        verbose_name="Data da evolução",
    )

    class Meta:
        db_table = "enfermagem_evolucaoenfermagem"  # Nome legado
        verbose_name = "Evolução de Enfermagem"
        verbose_name_plural = "Evoluções de Enfermagem"
        ordering = ["-evolution_date"]  # Mais recentes primeiro

    def __str__(self):
        return f"Evolução - {self.patient}"
