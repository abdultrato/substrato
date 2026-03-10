from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from nucleo.modelos.base import NoNameCoreModel


class ProcedimentoItemValor(NoNameCoreModel):
    prefixo = "PIVLR"

    item = models.OneToOneField(
        "enfermagem.ProcedimentoItem",
        on_delete=models.CASCADE,
        related_name="valor",
    )
    preco_unitario = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Valor do Item de Procedimento"
        verbose_name_plural = "Valores dos Itens de Procedimento"
        indexes = [
            models.Index(fields=["inquilino", "item"]),
            models.Index(fields=["preco_unitario"]),
        ]

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.item_id:
            self.inquilino_id = self.item.inquilino_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item} - {self.preco_unitario}"
