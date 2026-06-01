from decimal import Decimal

from django.db import models

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField
from .ward import WardScopedModel


class ProcedureMaterialValue(TenantPropagationMixin, WardScopedModel, NoNameCoreModel):
    """Valor unitário efetivo de um material consumido em procedimento."""

    tenant_source = "material"
    prefix = "PMV"
    ward_source_paths = ("material",)

    material = models.OneToOneField(
        "enfermagem.ProcedureMaterial",
        on_delete=models.CASCADE,
        related_name="value",
        db_index=True,
    )

    unit_cost = MoneyField(

        db_column="unit_cost",

        default=Decimal("0.00"),
    )

    active = models.BooleanField(

        db_column="active",

        default=True,
        db_index=True,
    )

    class Meta:
        db_table = "enfermagem_procedimentomaterialvalor"
        verbose_name = "Valor do Material do Procedimento"
        verbose_name_plural = "Valores dos Materiais do Procedimento"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.material_id} - {self.unit_cost}"

