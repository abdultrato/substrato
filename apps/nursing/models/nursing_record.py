from django.db import models

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import CoreModel


class NursingRecord(TenantPropagationMixin, CoreModel):
    """
    Registro de procedures ou observações realizadas pela enfermagem.
    """

    tenant_source = "patient"
    prefix = "REG"

    class Prioridade(models.TextChoices):
        URGENTE = "URG", "Urgente"
        NORMAL = "NOR", "Normal"
        BAIXA = "BAI", "Baixa"

    patient = models.ForeignKey(
        "clinical.Patient",
        verbose_name="Paciente",
        db_column="patient_id",
        on_delete=models.CASCADE,
        related_name="registros_enfermagem",
    )

    priority = models.CharField(
        db_column="priority",
        verbose_name="Prioridade",
        max_length=3,
        choices=Prioridade.choices,
        default=Prioridade.NORMAL,
        db_index=True,
    )

    observation = models.TextField(
        db_column="observation",
        verbose_name="Observação",
        blank=True, default="")

    record_date = models.DateTimeField(

        db_column="record_date",

        auto_now_add=True, verbose_name="Data do record")

    class Meta:
        db_table = "enfermagem_registroenfermagem"
        verbose_name = "Registro de Enfermagem"
        verbose_name_plural = "Registros de Enfermagem"
        ordering = ["-record_date"]

    def __str__(self):
        return f"Registro - {self.patient}"
