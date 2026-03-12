from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from nucleo.modelos.base import CoreModel


class Produto(CoreModel):
    prefixo = "PROD"

    class TipoProduto(models.TextChoices):
        MEDICAMENTO = "MED", "Medicamento"
        MATERIAL = "MAT", "Material"
        OUTRO = "OUT", "Outro"

    categoria = models.ForeignKey(
        "farmacia.CategoriaProduto",
        on_delete=models.PROTECT,
        related_name="produtos",
        null=True,
        blank=True,
        db_index=True,
    )

    tipo = models.CharField(
        max_length=3,
        choices=TipoProduto.choices,
        default=TipoProduto.OUTRO,
        db_index=True,
    )

    preco_venda = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["inquilino", "nome"]),
            models.Index(fields=["categoria"]),
            models.Index(fields=["tipo"]),
        ]

    def __str__(self) -> str:
        return self.nome or f"Produto {self.pk}"

