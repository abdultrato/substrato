from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class SaldoConta(models.Model):
    conta = models.OneToOneField(
        "contabilidade.Conta",
        on_delete=models.CASCADE,
        related_name="saldo",
        db_index=True,
    )

    saldo_atual = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    atualizado_em = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        verbose_name = "Saldo de Conta"
        verbose_name_plural = "Saldos de Conta"
        ordering = ["-atualizado_em"]

    def __str__(self) -> str:
        return f"{self.conta_id}: {self.saldo_atual}"
