from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.models.base import CoreModel


class Product(CoreModel):
    prefix = "PROD"

    class ProductType(models.TextChoices):
        MEDICAMENTO = "MED", "Medicamento"
        MATERIAL = "MAT", "Material"
        OUTRO = "OUT", "Outro"

    TipoProduto = ProductType

    category = models.ForeignKey(

        "farmacia.ProductCategory",

        db_column="categoria_id",
        verbose_name="Categoria",
        on_delete=models.PROTECT,
        related_name="produtos",
        null=True,
        blank=True,
        db_index=True,
    )

    type = models.CharField(

        db_column="tipo",

        verbose_name="Tipo",
        max_length=3,
        choices=ProductType.choices,
        default=ProductType.OUTRO,
        db_index=True,
    )

    sale_price = models.DecimalField(

        db_column="preco_venda",

        verbose_name="Preço de sale",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    vat_percentage = models.DecimalField(

        db_column="iva_percentual",

        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao product (0 a 100).",
    )

    applies_vat_by_default = models.BooleanField(

        db_column="aplica_iva_por_padrao",

        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este product normalmente não deve ter IVA.",
    )

    class Meta:
        db_table = "farmacia_produto"
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "name"]),
            models.Index(fields=["category"]),
            models.Index(fields=["type"]),
        ]

    def __str__(self) -> str:
        return self.name or f"Produto {self.pk}"
