from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from infrastructure.orm.fields.money_field import MoneyField
from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel


class ProcedureCatalogMaterial(PropagarInquilinoMixin, NoNameCoreModel):
    """
    Materiais padrão utilizados por um item do catálogo.
    """

    fonte_inquilino = "catalogo"
    prefixo = "PCM"

    catalogo = models.ForeignKey(
        "enfermagem.ProcedureCatalog",
        on_delete=models.CASCADE,
        related_name="materiais_padrao",
        db_index=True,
    )

    produto = models.ForeignKey(
        "farmacia.Product",
        on_delete=models.PROTECT,
        related_name="materiais_padrao_procedimento",
        db_index=True,
    )

    quantidade_padrao = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    custo_unitario_padrao = MoneyField(
        default=Decimal("0.00"),
    )

    observacao = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Material de Procedimento"
        verbose_name_plural = "Materiais de Procedimentos"
        ordering = ["catalogo", "produto"]
        constraints = [
            models.UniqueConstraint(
                fields=["catalogo", "produto"],
                condition=Q(deletado=False),
                name="unique_material_padrao_por_catalogo",
            )
        ]

    def __str__(self):
        return f"{self.produto} ({self.catalogo})"

