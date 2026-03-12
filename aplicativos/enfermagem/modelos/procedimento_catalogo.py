from decimal import Decimal

from django.db import models

from infrastrutura.orm.fields.dinheiro_field import DinheiroField
from nucleo.modelos import CoreModel


class ProcedimentoCatalogo(CoreModel):
    """
    Catálogo de procedimentos de enfermagem.

    Usado como base para:
    - valor padrão (`preco_padrao`)
    - materiais padrão (`materiais_padrao`)
    """

    prefixo = "PCAT"

    descricao = models.TextField(blank=True, default="")

    preco_padrao = DinheiroField(
        verbose_name="Preço padrão",
        default=Decimal("0.00"),
    )

    class Meta:
        verbose_name = "Procedimento (Catálogo)"
        verbose_name_plural = "Procedimentos (Catálogo)"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome or f"Procedimento {self.pk}"
