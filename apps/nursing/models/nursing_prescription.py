from django.db import models

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import CoreModel
from .ward import WardScopedModel


class NursingPrescription(TenantPropagationMixin, WardScopedModel, CoreModel):
    """Prescrição de cuidados de enfermagem para um paciente."""

    tenant_source = "patient"
    prefix = "PRE"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        db_column="patient_id",
        on_delete=models.PROTECT,
        related_name="prescricoes_enfermagem",
    )

    description = models.TextField(

        db_column="description",

        verbose_name="Descrição da prescrição")

    prescription_date = models.DateTimeField(

        db_column="prescription_date",

        auto_now_add=True, verbose_name="Data da prescrição")

    active = models.BooleanField(

        db_column="active",

        default=True, verbose_name="Prescrição ativa")

    class Meta:
        db_table = "enfermagem_prescricaoenfermagem"
        verbose_name = "Prescrição de Enfermagem"
        verbose_name_plural = "Prescrições de Enfermagem"
        ordering = ["-prescription_date"]

    def __str__(self):
        return f"Prescrição - {self.patient}"
