from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import CoreModel
from .ward import WardScopedModel


class NursingVitalSign(TenantPropagationMixin, WardScopedModel, CoreModel):
    """Registro de sinais vitais coletados pela enfermagem."""

    tenant_source = "record"
    prefix = "SVI"
    ward_source_paths = ("record",)

    patient = models.ForeignKey("clinical.Patient", verbose_name="Paciente", on_delete=models.PROTECT)

    record = models.ForeignKey(
        "enfermagem.NursingRecord",
        verbose_name="Registro",
        db_column="record_id",
        on_delete=models.PROTECT,
        related_name="signals_vitais",
        db_index=True,
    )

    temperature_c = models.DecimalField(

        db_column="temperature_c",

        max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="Temperatura (°C)"
    )
    blood_pressure = models.CharField(
        db_column="blood_pressure",
        verbose_name="Pressão arterial",
        max_length=20, blank=True, default="")

    heart_rate = models.PositiveIntegerField(

        db_column="heart_rate",

        null=True, blank=True, verbose_name="Frequência cardíaca")

    respiratory_rate = models.PositiveIntegerField(

        db_column="respiratory_rate",

        null=True, blank=True, verbose_name="Frequência respiratória")

    oxygen_saturation = models.PositiveIntegerField(

        db_column="oxygen_saturation",

        null=True, blank=True, verbose_name="Saturação de O₂ (%)")

    collected_at = models.DateTimeField(
        db_column="collected_at",
        verbose_name="Coletado em",
        default=timezone.now, db_index=True)

    class Meta:
        db_table = "enfermagem_sinalvitalenfermagem"
        verbose_name = "Sinal Vital"
        verbose_name_plural = "Sinais Vitais"
        ordering = ["-collected_at", "-created_at"]

    def clean(self):
        super().clean()

        if self.patient_id and self.tenant_id and self.patient.tenant_id != self.tenant_id:
            raise ValidationError({"patient": "Paciente e sinal vital devem pertencer ao mesmo tenant."})

        if self.record_id and self.patient_id and self.record.patient_id != self.patient_id:
            raise ValidationError({"record": "Registro de enfermagem deve pertencer ao paciente informado."})

    def __str__(self):
        return f"Sinais vitais - {self.record_id}"
