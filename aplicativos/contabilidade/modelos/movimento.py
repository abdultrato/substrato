from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from nucleo.modelos.base import CoreModel


class Movimento(CoreModel):
    """
    Linha de movimentação legado (débito/crédito).
    """

    prefixo = "MOV"

    lancamento = models.ForeignKey(
        "contabilidade.Lancamento",
        on_delete=models.CASCADE,
        related_name="movimentos",
        db_index=True,
    )
    conta = models.ForeignKey(
        "contabilidade.Conta",
        on_delete=models.PROTECT,
        related_name="movimentos",
        db_index=True,
    )

    debito = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    credito = models.DecimalField(
        max_digits=18,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "lancamento"]),
            models.Index(fields=["inquilino", "conta"]),
        ]

    def clean(self):
        super().clean()

        if self.debito and self.credito:
            raise ValidationError("Movimento não pode ter débito e crédito ao mesmo tempo.")

    def __str__(self) -> str:
        return f"{self.conta_id} D{self.debito} C{self.credito}"

