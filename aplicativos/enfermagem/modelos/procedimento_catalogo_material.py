from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from nucleo.modelos.base import NoNameCoreModel


class ProcedimentoCatalogoMaterial(NoNameCoreModel):
    prefixo = "PCMAT"

    catalogo = models.ForeignKey(
        "enfermagem.ProcedimentoCatalogo",
        on_delete=models.CASCADE,
        related_name="materiais_padrao",
        db_index=True,
    )
    produto = models.ForeignKey(
        "farmacia.Produto",
        on_delete=models.PROTECT,
        related_name="materiais_padrao_procedimento",
        db_index=True,
    )
    quantidade_padrao = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )
    custo_unitario_padrao = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    observacao = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["catalogo", "produto"]
        verbose_name = "Material Padrão do Procedimento"
        verbose_name_plural = "Materiais Padrão do Procedimento"
        indexes = [
            models.Index(fields=["inquilino", "catalogo"]),
            models.Index(fields=["produto"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["catalogo", "produto"],
                condition=models.Q(deletado=False),
                name="unique_produto_por_catalogo_procedimento",
            )
        ]

    def save(self, *args, **kwargs):
        if not self.inquilino_id and self.catalogo_id:
            self.inquilino_id = self.catalogo.inquilino_id
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.catalogo.nome} - {self.produto.nome}"
