from django.db import models

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import CoreModel


class NursingRecord(PropagarInquilinoMixin, CoreModel):
    """
    Registro de procedures ou observações realizadas pela enfermagem.
    """

    fonte_tenant = "patient"
    prefix = "REG"

    class Prioridade(models.TextChoices):
        URGENTE = "URG", "Urgente"
        NORMAL = "NOR", "Normal"
        BAIXA = "BAI", "Baixa"

    patient = models.ForeignKey(

        "clinico.Patient",

        db_column="paciente_id",
        on_delete=models.CASCADE,
        related_name="registros_enfermagem",
    )

    priority = models.CharField(

        db_column="prioridade",

        max_length=3,
        choices=Prioridade.choices,
        default=Prioridade.NORMAL,
        db_index=True,
    )

    observation = models.TextField(

        db_column="observacao",

        blank=True, default="")

    record_date = models.DateTimeField(

        db_column="data_registro",

        auto_now_add=True, verbose_name="Data do record")

    class Meta:
        db_table = "enfermagem_registroenfermagem"
        verbose_name = "Registro de Enfermagem"
        verbose_name_plural = "Registros de Enfermagem"
        ordering = ["-record_date"]

    def __str__(self):
        return f"Registro - {self.patient}"
