from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.mixins.model.description import DescriptionMixin
from core.mixins.model.order import OrderMixin
from core.models import CoreModel


class CoveragePlan(DescriptionMixin, OrderMixin, CoreModel):
    """
    Plano de cobertura associado a uma insurer.
    """

    prefix = "PLC"

    insurer = models.ForeignKey(

        "seguradora.Insurer",

        db_column="insurer_id",
        on_delete=models.PROTECT,
        related_name="planos",
    )

    coverage_percentage = models.DecimalField(

        db_column="coverage_percentage",

        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Percentual de cobertura (0-100).",
    )

    requires_authorization = models.BooleanField(

        db_column="requires_authorization",

        default=False, db_index=True)

    # Compatibilidade com filtros/viewsets gerados
    active = models.BooleanField(
        db_column="active",
        default=True, db_index=True)

    class Meta:
        db_table = "seguradora_planocobertura"
        verbose_name = "Plano de Cobertura"
        verbose_name_plural = "Planos de Cobertura"

    def percentual_final(self) -> Decimal:
        return self.coverage_percentage

    def __str__(self) -> str:
        return self.name or f"Plano {self.pk}"
