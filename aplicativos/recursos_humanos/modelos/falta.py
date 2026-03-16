from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel


class Falta(NoNameCoreModel):
    """
    Registro de faltas/ausências (MVP).
    """

    prefixo = "FLT"

    funcionario = models.ForeignKey(
        "recursos_humanos.Funcionario",
        on_delete=models.CASCADE,
        related_name="faltas",
        db_index=True,
    )

    data = models.DateField(default=timezone.now, db_index=True)
    motivo = models.CharField(max_length=255, blank=True, default="")
    justificada = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = "Falta"
        verbose_name_plural = "Faltas"
        ordering = ["-data", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "funcionario", "data"]),
            models.Index(fields=["inquilino", "justificada", "data"]),
        ]

    def clean(self):
        super().clean()
        if self.funcionario_id and self.inquilino_id and self.funcionario.inquilino_id != self.inquilino_id:
            raise ValidationError({"funcionario": "Funcionário e falta devem pertencer ao mesmo inquilino."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.funcionario_id:
            self.inquilino_id = self.funcionario.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)
