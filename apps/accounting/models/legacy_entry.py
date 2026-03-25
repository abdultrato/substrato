from django.db import models
from django.utils import timezone

from core.models.base import CoreModel


class LegacyEntry(CoreModel):
    """
    Lançamento contábil legado (mantido por compatibilidade).
    """

    prefix = "LAN"

    description = models.TextField("Descrição", 

        db_column="descricao",

         blank=True, default="")
    date = models.DateField("Data", 
        db_column="data",
         default=timezone.localdate, db_index=True)
    external_reference = models.CharField("Referência externa", 
        db_column="referencia_externa",
         max_length=120, blank=True, default="", db_index=True)
    confirmed = models.BooleanField("Confirmado", 
        db_column="confirmado",
         default=False, db_index=True)

    class Meta:
        db_table = "contabilidade_lancamento"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "date"]),
            models.Index(fields=["tenant", "confirmed"]),
            models.Index(fields=["external_reference"]),
        ]

    def __str__(self) -> str:
        return self.name or self.external_reference or f"Lancamento {self.pk}"
