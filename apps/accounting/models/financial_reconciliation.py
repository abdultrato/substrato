"""Conciliação financeira entre valor contábil e valor recebido."""

from decimal import Decimal  # Valores monetários

from django.core.validators import MinValueValidator  # Validador mínimo
from django.db import models  # ORM

from core.models.base import CoreModel  # Modelo base


class FinancialReconciliation(CoreModel):
    """Registro de conciliação por fatura."""

    prefix = "CON"  # Prefixo para IDs amigáveis

    invoice = models.ForeignKey(
        "faturamento.Invoice",  # Fatura associada
        verbose_name="Fatura",  # Rótulo
        db_column="invoice_id",  # Coluna
        on_delete=models.PROTECT,  # Evita apagar fatura conciliada
        related_name="conciliacoes",  # Nome reverso
        db_index=True,  # Índice
    )

    external_reference = models.CharField(
        db_column="external_reference",  # Coluna
        verbose_name="Referência externa",  # Rótulo
        max_length=120,
        blank=True,
        default="",
        db_index=True,
    )

    accounting_value = models.DecimalField(
        db_column="accounting_value",  # Coluna
        verbose_name="Valor contábil",  # Rótulo
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    received_amount = models.DecimalField(
        db_column="received_amount",  # Coluna
        verbose_name="Valor recebido",  # Rótulo
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    discrepancy = models.DecimalField(
        db_column="discrepancy",  # Coluna
        verbose_name="Diferença",  # Rótulo
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    reconciled = models.BooleanField(
        db_column="reconciled",  # Coluna
        verbose_name="Conciliado",  # Rótulo
        default=False,
        db_index=True,
    )

    class Meta:
        db_table = "contabilidade_conciliacaofinanceira"  # Nome da tabela
        verbose_name = "Conciliação financeira"
        verbose_name_plural = "Conciliações financeiras"
        ordering = ["-created_at"]  # Mais recente primeiro
        indexes = [
            models.Index(fields=["invoice"]),
            models.Index(fields=["reconciled"]),
        ]

    def save(self, *args, **kwargs):
        """Calcula diferença e marca conciliação automaticamente."""
        # Mantém divergência consistente.
        self.discrepancy = (self.accounting_value or Decimal("0.00")) - (
            self.received_amount or Decimal("0.00")
        )
        self.reconciled = self.discrepancy == Decimal("0.00")
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        """Representação legível."""
        return self.custom_id or f"Conciliação {self.pk}"
