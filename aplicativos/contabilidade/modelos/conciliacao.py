from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from nucleo.modelos.base import CoreModel


class ConciliacaoFinanceira(CoreModel):
    prefixo = "CON"

    fatura = models.ForeignKey(
        "faturamento.Fatura",
        on_delete=models.PROTECT,
        related_name="conciliacoes",
        db_index=True,
    )

    referencia_externa = models.CharField(max_length=120, blank=True, default="", db_index=True)

    valor_contabil = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    valor_recebido = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    divergencia = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    conciliado = models.BooleanField(default=False, db_index=True)

    class Meta:
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["fatura"]),
            models.Index(fields=["conciliado"]),
        ]

    def save(self, *args, **kwargs):
        # Mantém divergência consistente.
        self.divergencia = (self.valor_contabil or Decimal("0.00")) - (
            self.valor_recebido or Decimal("0.00")
        )
        self.conciliado = self.divergencia == Decimal("0.00")
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.id_custom or f"Conciliação {self.pk}"

