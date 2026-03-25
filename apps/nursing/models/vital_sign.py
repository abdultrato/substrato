from django.db import models
from django.utils import timezone

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import CoreModel


class NursingVitalSign(PropagarInquilinoMixin, CoreModel):
    """
    Registro de sinais vitais do patient.
    """

    fonte_tenant = "record"
    prefix = "SVI"

    record = models.ForeignKey(

        "enfermagem.NursingRecord",

        db_column="registro_id",
        on_delete=models.CASCADE,
        related_name="signals_vitais",
        db_index=True,
    )

    temperature_c = models.DecimalField(

        db_column="temperatura_c",

        max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="Temperatura (°C)"
    )
    blood_pressure = models.CharField(
        db_column="pressao_arterial",
        max_length=20, blank=True, default="")

    heart_rate = models.PositiveIntegerField(

        db_column="frequencia_cardiaca",

        null=True, blank=True, verbose_name="Frequência cardíaca")

    respiratory_rate = models.PositiveIntegerField(

        db_column="frequencia_respiratoria",

        null=True, blank=True, verbose_name="Frequência respiratória")

    oxygen_saturation = models.PositiveIntegerField(

        db_column="saturacao_oxigenio",

        null=True, blank=True, verbose_name="Saturação de O₂ (%)")

    collected_at = models.DateTimeField(

        db_column="coletado_em",

        default=timezone.now, db_index=True)

    class Meta:
        db_table = "enfermagem_sinalvitalenfermagem"
        verbose_name = "Sinal Vital"
        verbose_name_plural = "Sinais Vitais"
        ordering = ["-collected_at", "-created_at"]

    def __str__(self):
        return f"Sinais vitais - {self.record_id}"
