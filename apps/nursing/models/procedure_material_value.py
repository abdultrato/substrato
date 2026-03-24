from decimal import Decimal

from django.db import models

from infrastructure.orm.fields.money_field import MoneyField
from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel


class ProcedureMaterialValue(PropagarInquilinoMixin, NoNameCoreModel):
    """
    Valor unitário efetivo de um material consumido em procedimento.
    """

    fonte_inquilino = "material"
    prefixo = "PMV"

    material = models.OneToOneField(
        "enfermagem.ProcedureMaterial",
        on_delete=models.CASCADE,
        related_name="valor",
        db_index=True,
    )

    custo_unitario = MoneyField(
        default=Decimal("0.00"),
    )

    ativo = models.BooleanField(
        default=True,
        db_index=True,
    )

    class Meta:
        verbose_name = "Valor do Material do Procedimento"
        verbose_name_plural = "Valores dos Materiais do Procedimento"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.material_id} - {self.custo_unitario}"

