from decimal import Decimal

from django.db import models

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField
from .ward import WardScopedModel


class ProcedureItemValue(TenantPropagationMixin, WardScopedModel, NoNameCoreModel):
    """Valor unitário efetivo de um item de procedimento (serviço)."""

    tenant_source = "item"
    prefix = "PIV"
    ward_source_paths = ("item",)

    item = models.OneToOneField(
        "enfermagem.ProcedureItem",
        on_delete=models.CASCADE,
        related_name="value",
        db_index=True,
    )

    unit_price = MoneyField(

        db_column="unit_price",

        default=Decimal("0.00"),
    )

    active = models.BooleanField(

        db_column="active",

        default=True,
        db_index=True,
    )

    class Meta:
        db_table = "enfermagem_procedimentoitemvalor"
        verbose_name = "Valor do Item de Procedimento"
        verbose_name_plural = "Valores dos Itens de Procedimento"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.item_id} - {self.unit_price}"

