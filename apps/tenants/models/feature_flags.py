from django.db import models

from core.models.base import NoNameCoreModel


class TenantFeatureFlag(NoNameCoreModel):
    prefix = "FF"

    key = models.CharField(

        db_column="chave",

        max_length=120, db_index=True)
    active = models.BooleanField(
        db_column="ativo",
        default=True, db_index=True)

    class Meta:
        db_table = "inquilinos_featureflagtenant"
        verbose_name = "Feature Flag (Tenant)"
        verbose_name_plural = "Feature Flags (Tenant)"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "key"],
                name="unique_featureflag_por_tenant",
            )
        ]

    def __str__(self) -> str:
        return f"{self.tenant_id}:{self.key}"
