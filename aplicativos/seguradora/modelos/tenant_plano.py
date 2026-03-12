from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from nucleo.mixins.modelo.descricao import DescricaoMixin
from nucleo.mixins.modelo.ordem import OrdemMixin
from nucleo.modelos import CoreModel


class TenantPlanoCobertura(DescricaoMixin, OrdemMixin, CoreModel):
    """
    Override de plano por inquilino.

    Se existir registro ativo para (inquilino, plano_global), usa-se este
    percentual no calculo de coparticipacao.
    """

    prefixo = "TPL"

    plano_global = models.ForeignKey(
        "seguradora.PlanoCobertura",
        on_delete=models.CASCADE,
        related_name="overrides_por_tenant",
    )

    percentual_override = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Se vazio, usa o percentual do plano global.",
    )

    # Compatibilidade com servicos/filters gerados
    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Plano por Tenant"
        verbose_name_plural = "Planos por Tenant"
        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "plano_global"],
                name="uniq_tenant_plano_global",
            )
        ]

    def percentual_final(self) -> Decimal:
        if self.percentual_override is None:
            return self.plano_global.percentual_final()
        return self.percentual_override

    def __str__(self) -> str:
        return f"{self.inquilino_id} - {self.plano_global_id}"

