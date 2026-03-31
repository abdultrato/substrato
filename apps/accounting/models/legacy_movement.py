"""Movimentação contábil legado (débito/crédito)."""

from decimal import Decimal  # Valores monetários

from django.core.exceptions import ValidationError  # Validações de domínio
from django.core.validators import MinValueValidator  # Validador mínimo
from django.db import models  # ORM

from core.models.base import CoreModel  # Modelo base


class LegacyMovement(CoreModel):
    """
    Linha de movimentação legado (débito/crédito).
    """

    prefix = "MOV"  # Prefixo de IDs legados

    entry = models.ForeignKey(
        "contabilidade.LegacyEntry",  # Lançamento legado
        db_column="entry_id",  # Coluna
        verbose_name="Lançamento",  # Rótulo
        on_delete=models.CASCADE,  # Remove movimento ao apagar lançamento
        related_name="movimentos",  # Nome reverso
        db_index=True,  # Índice
    )
    account = models.ForeignKey(
        "contabilidade.Account",  # Conta contábil
        db_column="account_id",  # Coluna
        verbose_name="Conta",  # Rótulo
        on_delete=models.PROTECT,  # Protege conta
        related_name="movimentos",  # Nome reverso
        db_index=True,  # Índice
    )

    debit = models.DecimalField(
        "Débito",  # Rótulo
        db_column="debit",  # Coluna
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
        value = kwargs.pop("value", None)  # Valor simplificado opcional
        direction = kwargs.get("debit")  # Booleano indicando débito

        if value is not None and isinstance(direction, bool):
            value_decimal = Decimal(value)  # Converte para Decimal
            if direction:
                kwargs["debit"] = value_decimal
                kwargs["credit"] = Decimal("0.00")
            else:
                kwargs["debit"] = Decimal("0.00")
                kwargs["credit"] = value_decimal

        super().__init__(*args, **kwargs)

    class Meta:
        db_table = "contabilidade_movimento"  # Nome da tabela
        verbose_name = "Movimento legado"
        verbose_name_plural = "Movimentos legados"
        ordering = ["-created_at"]  # Mais recentes primeiro
        indexes = [
            models.Index(fields=["tenant", "entry"]),
            models.Index(fields=["tenant", "account"]),
        ]

    def clean(self):
        super().clean()

        if self.debit and self.credit:
            raise ValidationError("Movimento não pode ter débito e crédito ao mesmo tempo.")

    def __str__(self) -> str:
        """Exibe conta e valores de débito/crédito."""
        return f"{self.account_id} D{self.debit} C{self.credit}"
