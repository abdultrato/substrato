from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class AccountBalance(models.Model):
    account = models.OneToOneField(
        "contabilidade.Account",
        verbose_name="Conta",
        db_column="account_id",
        on_delete=models.CASCADE,
        related_name="saldo",
        db_index=True,
    )

    current_balance = models.DecimalField(
        db_column="current_balance",
        verbose_name="Saldo atual",
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    updated_at = models.DateTimeField(
        db_column="updated_at",
        verbose_name="Atualizado em",
        auto_now=True,
        db_index=True,
    )

    class Meta:
        db_table = "contabilidade_saldoconta"
        verbose_name = "Saldo de Conta"
        verbose_name_plural = "Saldos de Conta"
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.account_id}: {self.current_balance}"
