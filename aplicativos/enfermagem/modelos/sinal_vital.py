from django.db import models
from django.utils import timezone

from nucleo.mixins.tenant_propagation import PropagarInquilinoMixin
from nucleo.modelos.base import CoreModel


class SinalVitalEnfermagem(PropagarInquilinoMixin, CoreModel):
    """
    Registro de sinais vitais do paciente.
    """

    fonte_inquilino = "registro"
    prefixo = "SVI"

    registro = models.ForeignKey(
        "enfermagem.RegistroEnfermagem",
        on_delete=models.CASCADE,
        related_name="sinais_vitais",
        db_index=True,
    )

    temperatura_c = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True, verbose_name="Temperatura (°C)"
    )
    pressao_arterial = models.CharField(max_length=20, blank=True, default="")

    frequencia_cardiaca = models.PositiveIntegerField(null=True, blank=True, verbose_name="Frequência cardíaca")

    frequencia_respiratoria = models.PositiveIntegerField(null=True, blank=True, verbose_name="Frequência respiratória")

    saturacao_oxigenio = models.PositiveIntegerField(null=True, blank=True, verbose_name="Saturação de O₂ (%)")

    coletado_em = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        verbose_name = "Sinal Vital"
        verbose_name_plural = "Sinais Vitais"
        ordering = ["-coletado_em", "-criado_em"]

    def __str__(self):
        return f"Sinais vitais - {self.registro_id}"
