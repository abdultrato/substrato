from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db import models

from nucleo.modelos.base import CoreModel
from nucleo.mixins.auditoria import AuditoriaMixin
from nucleo.mixins.soft_delete import SoftDeleteMixin
from nucleo.mixins.data_hora import TimeStampMixin

from .requisicao_analise import RequisicaoAnalise
from .exame import Exame


class RequisicaoItem(
    TimeStampMixin,
    AuditoriaMixin,
    SoftDeleteMixin,
    CoreModel,
):
    requisicao = models.ForeignKey(
        RequisicaoAnalise,
        on_delete=models.CASCADE,
        related_name="itens",
    )

    exame = models.ForeignKey(
        Exame,
        on_delete=models.PROTECT,
    )

    preco_unitario = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
    )

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["requisicao", "exame"],
                name="uniq_requisicao_exame",
            )
        ]
        indexes = [
            models.Index(fields=["requisicao"]),
            models.Index(fields=["exame"]),
        ]

    def clean(self):
        if self.quantidade <= 0:
            raise ValidationError("Quantidade deve ser maior que zero.")
        if self.preco_unitario < 0:
            raise ValidationError("Preço unitário não pode ser negativo.")

    @property
    def total(self):
        return self.preco_unitario * self.quantidade

    def __str__(self):
        return f"{self.exame.nome} ({self.quantidade}x)"
