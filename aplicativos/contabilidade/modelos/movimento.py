from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import CoreModel


class Movimento(CoreModel):

    lancamento = models.ForeignKey(
        "contabilidade.Lancamento",
        on_delete=models.CASCADE,
        related_name="movimentos",
        related_query_name="movimento",
        db_index=True,
    )

    conta = models.ForeignKey(
        "contabilidade.Conta",
        on_delete=models.PROTECT,
        related_name="movimentos",
        related_query_name="movimento",
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

        if not self.lancamento_id:
            raise ValidationError({"lancamento": "Lançamento é obrigatório."})

        if not self.conta_id:
            raise ValidationError({"conta": "Conta é obrigatória."})

        if self.lancamento.confirmado:
            raise ValidationError("Lançamento já confirmado. Não pode alterar.")

        if (
            self.inquilino_id
            and self.lancamento_id
            and self.lancamento.inquilino_id != self.inquilino_id
        ):
            raise ValidationError("Inquilino do movimento difere do lançamento.")

        if (
            self.inquilino_id
            and self.conta_id
            and self.conta.inquilino_id != self.inquilino_id
        ):
            raise ValidationError("Inquilino do movimento difere da conta.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.lancamento.confirmado:
            raise ValidationError("Não pode remover movimento confirmado.")
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.conta} D:{self.debito} C:{self.credito}"
