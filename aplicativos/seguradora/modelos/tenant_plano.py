from django.db import models
from nucleo.modelos.base import CoreModel


class TenantPlanoCobertura(CoreModel):
    """
    Permite customizar plano por tenant.
    """

    prefixo = "TPLC"

    plano_global = models.ForeignKey(
        "seguradora.PlanoCobertura",
        on_delete=models.PROTECT,
        related_name="customizacoes",
    )

    percentual_cobertura_custom = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )

    exige_autorizacao_custom = models.BooleanField(
        null=True,
        blank=True,
    )

    class Meta:
        unique_together = ("inquilino", "plano_global")
        verbose_name = "Plano Customizado do Tenant"
        verbose_name_plural = "Planos Customizados do Tenant"

    def percentual_final(self):
        return (
            self.percentual_cobertura_custom
            if self.percentual_cobertura_custom is not None
            else self.plano_global.percentual_cobertura
        )

    def exige_autorizacao_final(self):
        return (
            self.exige_autorizacao_custom
            if self.exige_autorizacao_custom is not None
            else self.plano_global.exige_autorizacao
        )
