from django.db import models


class ItemVenda(models.Model):
    venda = models.ForeignKey(
        "farmacia.Venda",
        on_delete=models.CASCADE,
        related_name="itens",
    )

    produto = models.ForeignKey(
        "farmacia.Produto",
        on_delete=models.PROTECT,
    )

    quantidade = models.IntegerField()
    preco_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    def total_linha(self):
        return self.quantidade * self.preco_unitario
