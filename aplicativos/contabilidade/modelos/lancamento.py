from django.db import models
from django.utils import timezone

from nucleo.modelos.base import CoreModel


class Lancamento(CoreModel):
    """
    Lançamento contábil legado (mantido por compatibilidade).
    """

    prefixo = "LAN"

    descricao = models.TextField("Descrição", blank=True, default="")
    data = models.DateField("Data", default=timezone.localdate, db_index=True)
    referencia_externa = models.CharField("Referência externa", max_length=120, blank=True, default="", db_index=True)
    confirmado = models.BooleanField("Confirmado", default=False, db_index=True)

    class Meta:
        ordering = ["-data", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "data"]),
            models.Index(fields=["inquilino", "confirmado"]),
            models.Index(fields=["referencia_externa"]),
        ]

    def __str__(self) -> str:
        return self.nome or self.referencia_externa or f"Lancamento {self.pk}"
