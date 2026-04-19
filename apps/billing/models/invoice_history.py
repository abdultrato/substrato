"""Histórico textual de eventos da fatura (auditoria)."""

from django.db import models  # ORM

from core.models.base import CoreModel  # Modelo base


class InvoiceHistory(CoreModel):
    """Armazena linhas de histórico com tipo de evento."""

    prefix = "HFAT"

    invoice = models.ForeignKey(
        "faturamento.Invoice",  # Fatura relacionada
        db_column="invoice_id",
        verbose_name="Fatura",
        on_delete=models.CASCADE,  # Remove histórico se fatura for apagada
        related_name="historico",
        db_index=True,
    )

    event_type = models.CharField(
        db_column="event_type",  # Coluna
        verbose_name="Tipo de evento",
        max_length=40,
        db_index=True,
    )
    description = models.TextField(
        db_column="description",  # Coluna
        verbose_name="Descrição",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "faturamento_historicofatura"  # Nome da tabela
        verbose_name = "Histórico de Fatura"
        verbose_name_plural = "Históricos de Fatura"
        ordering = ["-created_at"]  # Mais recente primeiro
        indexes = [
            models.Index(fields=["invoice", "created_at"]),
            models.Index(fields=["event_type"]),
        ]

    def __str__(self) -> str:
        """Retorna nome ou par fatura-tipo."""
        return self.name or f"{self.invoice_id} - {self.event_type}"
