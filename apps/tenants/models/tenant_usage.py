from django.db import models

from core.models.base import NoNameCoreModel


class TenantUsage(NoNameCoreModel):
    prefix = "USO"

    tenant = models.OneToOneField(
        "inquilinos.Tenant",
        db_column="inquilino_id",
        on_delete=models.CASCADE,
        related_name="uso",
        db_index=True,
    )

    active_users = models.PositiveIntegerField(

        db_column="usuarios_ativos",

        default=0)
    current_month_requests = models.PositiveIntegerField(
        db_column="requisicoes_mes_atual",
        default=0)

    class Meta:
        db_table = "inquilinos_usotenant"
        verbose_name = "Uso do Tenant"
        verbose_name_plural = "Uso dos Tenants"

    def __str__(self) -> str:
        return f"Uso {self.tenant_id}"
