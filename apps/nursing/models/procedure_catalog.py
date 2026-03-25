from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models import CoreModel
from infrastructure.orm.fields.money_field import MoneyField


class ProcedureCatalog(CoreModel):
    """
    Catálogo de procedures de enfermagem.

    Usado como base para:
    - value padrão (`default_price`)
    - materiais padrão (`materiais_padrao`)
    """

    prefix = "PCAT"

    description = models.TextField(

        db_column="description",

        verbose_name="Descrição", blank=True, default="")

    default_price = MoneyField(

        db_column="default_price",

        verbose_name="Preço padrão",
        default=Decimal("0.00"),
    )

    vat_percentage = models.DecimalField(

        db_column="vat_percentage",

        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao procedure (0 a 100).",
    )

    applies_vat_by_default = models.BooleanField(

        db_column="applies_vat_by_default",

        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este procedure normalmente não deve ter IVA.",
    )

    class Meta:
        db_table = "enfermagem_procedimentocatalogo"
        verbose_name = "Procedimento (Catálogo)"
        verbose_name_plural = "Procedimentos (Catálogo)"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name or f"Procedimento {self.pk}"

