from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel


class Dispensa(NoNameCoreModel):
    """
    Dispensa/desligamento de funcionário (MVP).
    """

    prefixo = "DSP"

    class Tipo(models.TextChoices):
        DEMISSAO = "DEMISSAO", "Demissão"
        RESCISAO = "RESCISAO", "Rescisão"
        FIM_CONTRATO = "FIM_CONTRATO", "Fim de contrato"
        OUTRO = "OUTRO", "Outro"

    funcionario = models.ForeignKey(
        "recursos_humanos.Funcionario",
        on_delete=models.CASCADE,
        related_name="dispensas",
        db_index=True,
    )

    data = models.DateField(default=timezone.now, db_index=True)
    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.DEMISSAO, db_index=True)
    motivo = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Dispensa"
        verbose_name_plural = "Dispensas"
        ordering = ["-data", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "funcionario", "data"]),
            models.Index(fields=["inquilino", "tipo", "data"]),
        ]

    def clean(self):
        super().clean()
        if self.funcionario_id and self.inquilino_id and self.funcionario.inquilino_id != self.inquilino_id:
            raise ValidationError({"funcionario": "Funcionário e dispensa devem pertencer ao mesmo inquilino."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.funcionario_id:
            self.inquilino_id = self.funcionario.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)
