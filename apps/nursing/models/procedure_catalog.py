from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class ProcedureCatalog(CoreModel):
    """
    Catálogo de procedimentos de enfermagem.

    Usado como base para:
    - valor padrão (`preco_padrao`)
    - materiais padrão (`materiais_padrao`)
    """

    prefixo = "PCAT"

    descricao = models.TextField(verbose_name="Descrição", blank=True, default="")

    preco_padrao = MoneyField(
        verbose_name="Preço padrão",
        default=Decimal("0.00"),
    )

    iva_percentual = models.DecimalField(
        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao procedimento (0 a 100).",
    )

    aplica_iva_por_padrao = models.BooleanField(
        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este procedimento normalmente não deve ter IVA.",
    )

    class Meta:
        verbose_name = "Procedimento (Catálogo)"
        verbose_name_plural = "Procedimentos (Catálogo)"
        ordering = ["nome"]

    def __str__(self) -> str:
        return self.nome or f"Procedimento {self.pk}"

