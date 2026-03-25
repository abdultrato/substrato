from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class ProcedureCatalogMaterial(TenantPropagationMixin, NoNameCoreModel):
    """
    Materiais padrão utilizados por um item do catálogo.
    """

    tenant_source = "catalog"
    prefix = "PCM"

    catalog = models.ForeignKey(

        "enfermagem.ProcedureCatalog",

        db_column="catalog_id",
        on_delete=models.CASCADE,
        related_name="materiais_padrao",
        db_index=True,
    )

    product = models.ForeignKey(

        "farmacia.Product",

        db_column="product_id",
        on_delete=models.PROTECT,
        related_name="materiais_padrao_procedure",
        db_index=True,
    )

    default_quantity = models.DecimalField(

        db_column="default_quantity",

        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    default_unit_cost = MoneyField(

        db_column="default_unit_cost",

        default=Decimal("0.00"),
    )

    observation = models.TextField(

        db_column="observation",

        blank=True, default="")

    class Meta:
        db_table = "enfermagem_procedimentocatalogomaterial"
        verbose_name = "Material de Procedimento"
        verbose_name_plural = "Materiais de Procedimentos"
        ordering = ["catalog", "product"]
        constraints = [
            models.UniqueConstraint(
                fields=["catalog", "product"],
                condition=Q(deleted=False),
                name="unique_material_padrao_por_catalog",
            )
        ]

    def __str__(self):
        return f"{self.product} ({self.catalog})"

