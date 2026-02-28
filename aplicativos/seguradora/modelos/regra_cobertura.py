from django.db import models
from nucleo.modelos.base import CoreModel


class RegraCobertura(CoreModel):

    prefixo = "RCOB"

    plano = models.ForeignKey(
        "seguradora.PlanoCobertura",
        on_delete=models.CASCADE,
        related_name="regras",
    )

    codigo_exame = models.CharField(max_length=50, null=True, blank=True)
    cid = models.CharField(max_length=20, null=True, blank=True)

    percentual_cobertura = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )

    exige_autorizacao = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Regra de Cobertura"
        verbose_name_plural = "Regras de Cobertura"
