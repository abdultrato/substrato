from decimal import Decimal
from django.db import models
from nucleo.modelos.base import CoreModel
from aplicativos.clinico.modelos.exame import Exame
from .fatura import Fatura


class FaturaItem(CoreModel):

    fatura = models.ForeignKey(
        Fatura,
        on_delete=models.CASCADE,
        related_name="itens",
    )

    exame = models.ForeignKey(
        Exame,
        on_delete=models.PROTECT,
    )

    descricao = models.CharField(
        max_length=200,
        blank=True,
    )

    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
    )

    preco_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    isento_iva = models.BooleanField(default=False)

    class Meta:
        unique_together = ("fatura", "exame")
        indexes = [
            models.Index(fields=["fatura"]),
        ]

    def __str__(self):
        return f"{self.descricao or self.exame.nome} ({self.quantidade}x)"
