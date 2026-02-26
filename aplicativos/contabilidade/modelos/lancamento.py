from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models


class Lancamento(models.Model):
    descricao = models.CharField(max_length=255)
    data = models.DateTimeField(auto_now_add=True)

    referencia_externa = models.CharField(
        max_length=120,
        blank=True,
    )

    class Meta:
        indexes = [
            models.Index(fields=["data"]),
        ]

    def total_debitos(self):
        return sum((m.debito for m in self.movimentos.all()), Decimal("0.00"))

    def total_creditos(self):
        return sum((m.credito for m in self.movimentos.all()), Decimal("0.00"))

    def validar_partidas(self):
        if self.total_debitos() != self.total_creditos():
            raise ValidationError("Lançamento contábil desbalanceado.")

    def __str__(self):
        return self.descricao
