from django.db import models
from nucleo.modelos.base import CoreModel


class TenantSeguradora(CoreModel):
    """
    Vincula uma seguradora global a um tenant.
    """

    prefixo = "TSEG"

    seguradora = models.ForeignKey(
        "seguradora.Seguradora",
        on_delete=models.PROTECT,
        related_name="tenants",
    )

    ativa = models.BooleanField(default=True)

    class Meta:
        unique_together = ("inquilino", "seguradora")
        verbose_name = "Seguradora do Tenant"
        verbose_name_plural = "Seguradoras do Tenant"

    def __str__(self):
        return f"{self.inquilino.nome} - {self.seguradora.nome}"
