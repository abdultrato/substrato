from django.db import models
from aplicativos.faturamento.modelos.fatura import Fatura

class Pagamento(models.Model):
    fatura = models.ForeignKey(Fatura, on_delete=models.PROTECT)

    valor = models.DecimalField(max_digits=10, decimal_places=2)
    metodo = models.CharField(max_length=50)

    confirmado = models.BooleanField(default=False)
    data_pagamento = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pagamento {self.id} - {self.valor}"
