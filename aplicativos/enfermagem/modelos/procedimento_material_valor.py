from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from nucleo.modelos.base import NoNameCoreModel


class ProcedimentoMaterialValor(NoNameCoreModel):
    prefixo = "PMVLR"

    material = models.OneToOneField(
        "enfermagem.ProcedimentoMaterial",
        on_delete=models.CASCADE,
        related_name="valor",
    )
    custo_unitario = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Valor do Material de Procedimento"
        verbose_name_plural = "Valores dos Materiais de Procedimento"
        indexes = [
            models.Index(fields=["inquilino", "material"]),
            models.Index(fields=["custo_unitario"]),
        ]

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.material_id:
            self.inquilino_id = self.material.inquilino_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.material} - {self.custo_unitario}"
