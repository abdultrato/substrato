from decimal import Decimal

from django.db import models

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class ProcedureMaterialValue(PropagarInquilinoMixin, NoNameCoreModel):
    """
    Valor unitário efetivo de um material consumido em procedure.
    """

    fonte_tenant = "material"
    prefix = "PMV"

    material = models.OneToOneField(
        "enfermagem.ProcedureMaterial",
        on_delete=models.CASCADE,
        related_name="value",
        db_index=True,
    )

    unit_cost = MoneyField(

        db_column="custo_unitario",

        default=Decimal("0.00"),
    )

    active = models.BooleanField(

        db_column="ativo",

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

