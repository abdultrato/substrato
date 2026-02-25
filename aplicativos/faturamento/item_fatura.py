from django.db import models
from .fatura import Fatura

class ItemFatura(models.Model):
    fatura = models.ForeignKey(
        Fatura,
        on_delete=models.CASCADE,
        related_name="itens"
    )

    descricao = models.CharField(max_length=255)
    quantidade = models.PositiveIntegerField(default=1)
    preco_unitario = models.DecimalField(max_digits=10, decimal_places=2)

    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def calcular_subtotal(self):
        self.subtotal = self.quantidade * self.preco_unitario
