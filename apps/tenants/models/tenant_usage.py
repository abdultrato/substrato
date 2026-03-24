from django.db import models

from core.models.base import NoNameCoreModel


class TenantUsage(NoNameCoreModel):
    prefixo = "USO"

    inquilino = models.OneToOneField(
        "inquilinos.Tenant",
        on_delete=models.CASCADE,
        related_name="uso",
        db_index=True,
    )

    usuarios_ativos = models.PositiveIntegerField(default=0)
    requisicoes_mes_atual = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Uso do Tenant"
        verbose_name_plural = "Uso dos Tenants"

    def __str__(self) -> str:
        return f"Uso {self.inquilino_id}"
