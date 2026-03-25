from django.db import models

from core.models.base import CoreModel


class InvoiceHistory(CoreModel):
    prefix = "HFAT"

    invoice = models.ForeignKey(

        "faturamento.Invoice",

        db_column="fatura_id",
        verbose_name="Fatura",
        on_delete=models.CASCADE,
        related_name="historico",
        db_index=True,
    )

    event_type = models.CharField(

        db_column="tipo_evento",

        verbose_name="Tipo de evento", max_length=40, db_index=True)
    description = models.TextField(
        db_column="descricao",
        verbose_name="Descrição", blank=True, default="")

    class Meta:
        db_table = "faturamento_historicofatura"
        verbose_name = "Histórico de Fatura"
        verbose_name_plural = "Históricos de Fatura"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["invoice", "created_at"]),
            models.Index(fields=["event_type"]),
        ]

    def __str__(self) -> str:
        return self.name or f"{self.invoice_id} - {self.event_type}"
