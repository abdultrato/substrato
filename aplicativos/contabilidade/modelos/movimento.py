from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models

from .lancamento import Lancamento
from .conta import Conta


class Movimento(models.Model):
    lancamento = models.ForeignKey(
        Lancamento,
        on_delete=models.CASCADE,
        related_name="movimentos",
    )

    conta = models.ForeignKey(
        Conta,
        on_delete=models.PROTECT,
    )

    debito = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    credito = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
    )

    class Meta:
        indexes = [
            models.Index(fields=["lancamento"]),
            models.Index(fields=["conta"]),
        ]

    def clean(self):
        """
        Garante regra contábil:
        - Ou débito ou crédito
        - Nunca ambos
        - Nunca ambos zero
        """
        if self.debito > 0 and self.credito > 0:
            raise ValidationError(
                "Movimento não pode ter débito e crédito ao mesmo tempo."
            )

        if self.debito == 0 and self.credito == 0:
            raise ValidationError("Movimento deve ter débito ou crédito.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.conta} D:{self.debito} C:{self.credito}"
