from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
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
        verbose_name="Categoria",
        on_delete=models.PROTECT,
        related_name="produtos",
        null=True,
        blank=True,
        db_index=True,
    )

    tipo = models.CharField(
        verbose_name="Tipo",
        max_length=3,
        choices=TipoProduto.choices,
        default=TipoProduto.OUTRO,
        db_index=True,
    )

    preco_venda = models.DecimalField(
        verbose_name="Preço de venda",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    iva_percentual = models.DecimalField(
        verbose_name="IVA (%)",
        max_digits=5,
        decimal_places=2,
        default=Decimal("16.00"),
        validators=[
            MinValueValidator(Decimal("0.00")),
            MaxValueValidator(Decimal("100.00")),
        ],
        help_text="Taxa de IVA aplicada ao produto (0 a 100).",
    )

    aplica_iva_por_padrao = models.BooleanField(
        verbose_name="Aplicar IVA por padrão",
        default=True,
        help_text="Desmarque se este produto normalmente não deve ter IVA.",
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
