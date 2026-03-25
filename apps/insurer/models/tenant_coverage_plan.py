from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.mixins.model.description import DescriptionMixin
from core.mixins.model.order import OrderMixin
from core.models import CoreModel


class TenantCoveragePlan(DescriptionMixin, OrderMixin, CoreModel):
    """
    Override de plan por tenant.

    Se existir record active para (tenant, global_plan), usa-se este
    percentual no calculo de coparticipacao.
    """

    prefix = "TPL"

    global_plan = models.ForeignKey(

        "seguradora.CoveragePlan",

        db_column="global_plan_id",
        on_delete=models.CASCADE,
        related_name="overrides_por_tenant",
    )

    override_percentage = models.DecimalField(

        db_column="override_percentage",

        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Se vazio, usa o percentual do plan global.",
    )

    # Compatibilidade com servicos/filters gerados
    active = models.BooleanField(
        db_column="active",
        default=True, db_index=True)

    class Meta:
        db_table = "seguradora_tenantplanocobertura"
        verbose_name = "Plano por Tenant"
        verbose_name_plural = "Planos por Tenant"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "global_plan"],
                name="uniq_tenant_global_plan",
            )
        ]

    def percentual_final(self) -> Decimal:
        if self.override_percentage is None:
            return self.global_plan.percentual_final()
        return self.override_percentage

    def __str__(self) -> str:
        return f"{self.tenant_id} - {self.global_plan_id}"
