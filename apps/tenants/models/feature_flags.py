from django.db import models

from core.models.base import NoNameCoreModel


class TenantFeatureFlag(NoNameCoreModel):
    prefixo = "FF"

    chave = models.CharField(max_length=120, db_index=True)
    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Feature Flag (Tenant)"
        verbose_name_plural = "Feature Flags (Tenant)"
        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "chave"],
                name="unique_featureflag_por_inquilino",
            )
        ]

    def __str__(self) -> str:
        return f"{self.inquilino_id}:{self.chave}"
