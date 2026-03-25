from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Overtime(NoNameCoreModel):
    """
    Registro de horas extras (MVP).
    """

    prefixo = "HEX"

    funcionario = models.ForeignKey(
        "recursos_humanos.Employee",
        on_delete=models.CASCADE,
        related_name="horas_extras",
        db_index=True,
    )

    data = models.DateField(default=timezone.now, db_index=True)
    horas = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal("0.00"))
    multiplicador = models.DecimalField(max_digits=4, decimal_places=2, default=Decimal("1.50"))
    observacoes = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "recursos_humanos_horaextra"
        verbose_name = "Hora Extra"
        verbose_name_plural = "Horas Extras"
        ordering = ["-data", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "funcionario", "data"]),
        ]

    def clean(self):
        super().clean()

        if self.funcionario_id and self.inquilino_id and self.funcionario.inquilino_id != self.inquilino_id:
            raise ValidationError({"funcionario": "Funcionário e hora extra devem pertencer ao mesmo inquilino."})

        if self.horas is not None and self.horas < Decimal("0.00"):
            raise ValidationError({"horas": "Horas inválidas."})

        if self.multiplicador is not None and self.multiplicador <= Decimal("0.00"):
            raise ValidationError({"multiplicador": "Multiplicador inválido."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.funcionario_id:
            self.inquilino_id = self.funcionario.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)
