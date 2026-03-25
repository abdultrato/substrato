from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from core.models.base import CoreModel


class FinancialReconciliation(CoreModel):
    prefix = "CON"

    invoice = models.ForeignKey(

        "faturamento.Invoice",

        db_column="fatura_id",
        on_delete=models.PROTECT,
        related_name="conciliacoes",
        db_index=True,
    )

    external_reference = models.CharField(

        db_column="referencia_externa",

        max_length=120, blank=True, default="", db_index=True)

    accounting_value = models.DecimalField(

        db_column="valor_contabil",

        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    received_amount = models.DecimalField(
        db_column="valor_recebido",
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    discrepancy = models.DecimalField(
        db_column="divergencia",
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    reconciled = models.BooleanField(
        db_column="conciliado",
        default=False, db_index=True)

    class Meta:
        db_table = "contabilidade_conciliacaofinanceira"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["invoice"]),
            models.Index(fields=["reconciled"]),
        ]

    def save(self, *args, **kwargs):
        # Mantém divergência consistente.
        self.discrepancy = (self.accounting_value or Decimal("0.00")) - (self.received_amount or Decimal("0.00"))
        self.reconciled = self.discrepancy == Decimal("0.00")
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Conciliação {self.pk}"
