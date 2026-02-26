from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import Sum

from nucleo.modelos.base import CoreModel


class Lancamento(CoreModel):

    descricao = models.CharField(max_length=255)

    data_contabil = models.DateField(db_index=True)

    referencia_externa = models.CharField(
        max_length=120,
        blank=True,
        db_index=True,
    )

    confirmado = models.BooleanField(default=False, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["data_contabil"]),
            models.Index(fields=["confirmado"]),
        ]

    def total_debitos(self):
        return self.movimentos.aggregate(
            total=Sum("debito")
        )["total"] or Decimal("0.00")

    def total_creditos(self):
        return self.movimentos.aggregate(
            total=Sum("credito")
        )["total"] or Decimal("0.00")

    def validar_partidas(self):
        if self.total_debitos() != self.total_creditos():
            raise ValidationError("Lançamento contábil desbalanceado.")

    @transaction.atomic
    def confirmar(self):
        if self.confirmado:
            return

        self.validar_partidas()

        if self.movimentos.count() < 2:
            raise ValidationError("Lançamento deve possuir pelo menos 2 movimentos.")

        self.confirmado = True
        self.save(update_fields=["confirmado"])

    def __str__(self):
        return self.descricao
