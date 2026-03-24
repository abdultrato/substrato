from django.db import models

from core.models.base import CoreModel


class InvoiceHistory(CoreModel):
    prefixo = "HFAT"

    fatura = models.ForeignKey(
        "faturamento.Invoice",
        verbose_name="Fatura",
        on_delete=models.CASCADE,
        related_name="historico",
        db_index=True,
    )

    tipo_evento = models.CharField(verbose_name="Tipo de evento", max_length=40, db_index=True)
    descricao = models.TextField(verbose_name="Descrição", blank=True, default="")

    class Meta:
        verbose_name = "Histórico de Fatura"
        verbose_name_plural = "Históricos de Fatura"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["fatura", "criado_em"]),
            models.Index(fields=["tipo_evento"]),
        ]

    def __str__(self) -> str:
        return self.nome or f"{self.fatura_id} - {self.tipo_evento}"
