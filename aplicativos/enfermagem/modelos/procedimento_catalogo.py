from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from nucleo.modelos.base import CoreModel


class ProcedimentoCatalogo(CoreModel):
    prefixo = "PROCCAT"

    descricao = models.TextField(blank=True, default="")
    preco_padrao = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        ordering = ["nome", "criado_em"]
        verbose_name = "Procedimento de Catálogo"
        verbose_name_plural = "Procedimentos de Catálogo"
        indexes = [
            models.Index(fields=["inquilino", "nome"]),
        ]

    def __str__(self):
        return f"{self.nome} ({self.preco_padrao})"
