from nucleo.modelos.base import CoreModel
from django.db import models

class FeatureFlagTenant(CoreModel):
    prefixo = "FEATFLAGS"
    chave = models.CharField(max_length=100)
    ativo = models.BooleanField(default=False)

    class Meta:
        unique_together = ("inquilino", "chave")
