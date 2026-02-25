from django.db import models
from .lancamento import Lancamento
from .conta import Conta

class Movimento(models.Model):
    lancamento = models.ForeignKey(
        Lancamento,
        on_delete=models.CASCADE,
        related_name="movimentos"
    )

    conta = models.ForeignKey(Conta, on_delete=models.PROTECT)

    debito = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credito = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
n        return f"{self.conta} D:{self.debito} C:{self.credito}"
