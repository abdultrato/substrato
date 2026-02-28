from django.db import models
from nucleo.modelos.base import CoreModel
from .seguradora import Seguradora


class PlanoCobertura(CoreModel):
    """
    Plano específico dentro da seguradora.
    """

    prefixo = "PLC"

    seguradora = models.ForeignKey(
        Seguradora,
        on_delete=models.CASCADE,
        related_name="planos",
    )

    percentual_cobertura = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=100.00,
    )

    exige_autorizacao = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Plano de Cobertura"
        verbose_name_plural = "Planos de Cobertura"

    def __str__(self):
        return f"{self.seguradora.nome} - {self.nome}"
