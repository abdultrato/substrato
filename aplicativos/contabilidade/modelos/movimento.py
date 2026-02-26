from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import CoreModel
from .lancamento import Lancamento
from .contas import Conta


class Movimento(CoreModel):

    lancamento = models.ForeignKey(
        Lancamento,
        on_delete=models.CASCADE,
        related_name="movimentos",
        db_index=True,
    )

    conta = models.ForeignKey(
        Conta,
        on_delete=models.PROTECT,
        db_index=True,
    )

    debito = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    credito = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        indexes = [
            models.Index(fields=["lancamento"]),
            models.Index(fields=["conta"]),
        ]

    def clean(self):

        if self.debito > 0 and self.credito > 0:
            raise ValidationError("Não pode ter débito e crédito.")

        if self.debito == 0 and self.credito == 0:
            raise ValidationError("Movimento deve ter débito ou crédito.")

        if self.lancamento.confirmado:
            raise ValidationError("Lançamento já confirmado. Não pode alterar.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.lancamento.confirmado:
            raise ValidationError("Não pode remover movimento confirmado.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.conta} D:{self.debito} C:{self.credito}"
