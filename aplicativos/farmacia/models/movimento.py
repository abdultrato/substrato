from django.db import models
from .produto import Produto
from .lote import Lote


class MovimentoEstoque(models.Model):
    produto = models.ForeignKey(Produto, on_delete=models.PROTECT)
    lote = models.ForeignKey(Lote, on_delete=models.PROTECT)

    tipo = models.CharField(max_length=3)
    quantidade = models.IntegerField()

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.produto.nome} - {self.tipo} ({self.quantidade})"
