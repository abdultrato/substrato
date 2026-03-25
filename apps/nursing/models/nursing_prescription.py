from django.db import models

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import CoreModel


class NursingPrescription(PropagarInquilinoMixin, CoreModel):
    """
    Prescrição de cuidados de enfermagem para um patient.
    """

    fonte_tenant = "patient"
    prefix = "PRE"

    patient = models.ForeignKey(

        "clinico.Patient",

        db_column="patient_id",
        on_delete=models.CASCADE,
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

        default=True, verbose_name="Prescrição active")

    class Meta:
        db_table = "enfermagem_prescricaoenfermagem"
        verbose_name = "Prescrição de Enfermagem"
        verbose_name_plural = "Prescrições de Enfermagem"
        ordering = ["-prescription_date"]

    def __str__(self):
        return f"Prescrição - {self.patient}"
