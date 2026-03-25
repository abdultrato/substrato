from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class Holiday(NoNameCoreModel):
    """
    Datas marcadas como feriado para precificação (acréscimo percentual).

    Nota: o percent de acréscimo é configurado por tenant (ConfiguracaoInquilino).
    """

    prefix = "FER"

    date = models.DateField(

        db_column="data",

        db_index=True)
    description = models.CharField(
        db_column="descricao",
        max_length=255, blank=True, default="")
    active = models.BooleanField(
        db_column="ativo",
        default=True, db_index=True)

    class Meta:
        db_table = "consultas_feriado"
        verbose_name = "Feriado"
        verbose_name_plural = "Feriados"
        ordering = ["-date", "-created_at"]
        unique_together = ("tenant", "date")
        indexes = [
            models.Index(fields=["tenant", "date"]),
            models.Index(fields=["tenant", "active", "date"]),
        ]

    def clean(self):
        super().clean()
        if not self.date:
            raise ValidationError({"date": "Informe a date do feriado."})

    def __str__(self) -> str:
        return f"{self.date} {self.description}".strip()
