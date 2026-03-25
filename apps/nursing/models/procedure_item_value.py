from decimal import Decimal

from django.db import models

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class ProcedureItemValue(PropagarInquilinoMixin, NoNameCoreModel):
    """
    Valor unitário efetivo de um item de procedure.
    """

    fonte_tenant = "item"
    prefix = "PIV"

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

