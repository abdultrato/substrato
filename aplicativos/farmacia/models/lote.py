from django.db import models
from datetime import date


class Lote(models.Model):
    produto = models.ForeignKey(
        "farmacia.Produto",
        on_delete=models.CASCADE,
        related_name="lotes",
    )

    numero_lote = models.CharField(max_length=100)
    validade = models.DateField()

    quantidade_inicial = models.IntegerField()
    quantidade_atual = models.IntegerField()

    class Meta:
        unique_together = ("produto", "numero_lote")

    def __str__(self):
        return f"{self.produto.nome} - Lote {self.numero_lote}"

    @property
    def vencido(self):
        return self.validade < date.today()
