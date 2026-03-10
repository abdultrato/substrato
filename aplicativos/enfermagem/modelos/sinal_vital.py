from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import CoreModel


class SinalVitalEnfermagem(CoreModel):
    prefixo = "SVENF"

    registro = models.ForeignKey(
        "enfermagem.RegistroEnfermagem",
        on_delete=models.CASCADE,
        related_name="sinais_vitais",
        db_index=True,
    )
    temperatura_c = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        null=True,
        blank=True,
    )
    frequencia_cardiaca = models.PositiveIntegerField(
        null=True,
        blank=True,
    )
    frequencia_respiratoria = models.PositiveIntegerField(
        null=True,
        blank=True,
    )
    saturacao_oxigenio = models.PositiveIntegerField(
        null=True,
        blank=True,
    )
    pressao_arterial = models.CharField(
        max_length=20,
        blank=True,
        default="",
    )
    coletado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-coletado_em", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "registro"]),
            models.Index(fields=["coletado_em"]),
        ]

    def clean(self):
        super().clean()
        if self.saturacao_oxigenio is not None and not 0 <= self.saturacao_oxigenio <= 100:
            raise ValidationError({"saturacao_oxigenio": "Saturação deve estar entre 0 e 100."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.registro_id:
            self.inquilino_id = self.registro.inquilino_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.id_custom} - {self.registro.paciente.nome}"
