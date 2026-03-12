from django.db import models

from nucleo.modelos.base import NoNameCoreModel


class UsoTenant(NoNameCoreModel):
    prefixo = "USO"

    inquilino = models.OneToOneField(
        "inquilinos.Inquilino",
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

