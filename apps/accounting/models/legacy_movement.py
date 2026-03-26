from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.models.base import CoreModel


class LegacyMovement(CoreModel):
    """
    Linha de movimentação legado (débito/crédito).
    """

    prefix = "MOV"

    entry = models.ForeignKey(

        "contabilidade.LegacyEntry",

        db_column="entry_id",
        verbose_name="Lançamento",
        on_delete=models.CASCADE,
        related_name="movimentos",
        db_index=True,
    )
    account = models.ForeignKey(
        "contabilidade.Account",
        db_column="account_id",
        verbose_name="Conta",
        on_delete=models.PROTECT,
        related_name="movimentos",
        db_index=True,
    )

    debit = models.DecimalField(

        "Débito",

        db_column="debit",
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    credit = models.DecimalField(
        "Crédito",
        db_column="credit",
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    def __init__(self, *args, **kwargs):
        value = kwargs.pop("value", None)
        direction = kwargs.get("debit")

        if value is not None and isinstance(direction, bool):
            value_decimal = Decimal(value)
            if direction:
                kwargs["debit"] = value_decimal
                kwargs["credit"] = Decimal("0.00")
            else:
                kwargs["debit"] = Decimal("0.00")
                kwargs["credit"] = value_decimal

        super().__init__(*args, **kwargs)

    class Meta:
        db_table = "contabilidade_movimento"
        verbose_name = "Movimento legado"
        verbose_name_plural = "Movimentos legados"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "entry"]),
            models.Index(fields=["tenant", "account"]),
        ]

    def clean(self):
        super().clean()

        if self.debit and self.credit:
            raise ValidationError("Movimento não pode ter débito e crédito ao mesmo tempo.")

    def __str__(self) -> str:
        return f"{self.account_id} D{self.debit} C{self.credit}"
