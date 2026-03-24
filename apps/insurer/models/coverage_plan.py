from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.mixins.model.description import DescricaoMixin
from core.mixins.model.order import OrdemMixin
from core.models import CoreModel


class CoveragePlan(DescricaoMixin, OrdemMixin, CoreModel):
    """
    Plano de cobertura associado a uma seguradora.
    """

    prefixo = "PLC"

    seguradora = models.ForeignKey(
        "seguradora.Insurer",
        on_delete=models.PROTECT,
        related_name="planos",
    )

    percentual_cobertura = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Percentual de cobertura (0-100).",
    )

    exige_autorizacao = models.BooleanField(default=False, db_index=True)

    # Compatibilidade com filtros/viewsets gerados
    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Plano de Cobertura"
        verbose_name_plural = "Planos de Cobertura"

    def percentual_final(self) -> Decimal:
        return self.percentual_cobertura

    def __str__(self) -> str:
        return self.nome or f"Plano {self.pk}"
