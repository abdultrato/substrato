from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import NoNameCoreModel


class Feriado(NoNameCoreModel):
    """
    Datas marcadas como feriado para precificação (acréscimo percentual).

    Nota: o percent de acréscimo é configurado por tenant (ConfiguracaoInquilino).
    """

    prefixo = "FER"

    data = models.DateField(db_index=True)
    descricao = models.CharField(max_length=255, blank=True, default="")
    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Feriado"
        verbose_name_plural = "Feriados"
        ordering = ["-data", "-criado_em"]
        unique_together = ("inquilino", "data")
        indexes = [
            models.Index(fields=["inquilino", "data"]),
            models.Index(fields=["inquilino", "ativo", "data"]),
        ]

    def clean(self):
        super().clean()
        if not self.data:
            raise ValidationError({"data": "Informe a data do feriado."})

    def __str__(self) -> str:
        return f"{self.data} {self.descricao}".strip()
