from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import NoNameCoreModel


class Ferias(NoNameCoreModel):
    """
    Registo de férias (MVP).
    """

    prefixo = "FER"

    class Estado(models.TextChoices):
        SOLICITADA = "SOLIC", "Solicitada"
        APROVADA = "APROV", "Aprovada"
        GOZADA = "GOZADA", "Gozada"
        CANCELADA = "CANCEL", "Cancelada"

    funcionario = models.ForeignKey(
        "recursos_humanos.Funcionario",
        on_delete=models.CASCADE,
        related_name="ferias",
        db_index=True,
    )

    data_inicio = models.DateField(default=timezone.now, db_index=True)
    data_fim = models.DateField(default=timezone.now, db_index=True)
    estado = models.CharField(
        max_length=10,
        choices=Estado.choices,
        default=Estado.SOLICITADA,
        db_index=True,
    )
    observacoes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Férias"
        verbose_name_plural = "Férias"
        ordering = ["-data_inicio", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "funcionario", "data_inicio"]),
            models.Index(fields=["inquilino", "estado", "data_inicio"]),
        ]

    def clean(self):
        super().clean()

        if self.funcionario_id and self.inquilino_id and self.funcionario.inquilino_id != self.inquilino_id:
            raise ValidationError(
                {"funcionario": "Funcionário e férias devem pertencer ao mesmo inquilino."}
            )

        if self.data_inicio and self.data_fim and self.data_inicio > self.data_fim:
            raise ValidationError({"data_fim": "Data fim deve ser maior ou igual a data início."})

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.funcionario_id:
            self.inquilino_id = self.funcionario.inquilino_id
        self.full_clean()
        return super().save(*args, **kwargs)

