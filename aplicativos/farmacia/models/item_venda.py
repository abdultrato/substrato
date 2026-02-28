from decimal import Decimal
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q

from nucleo.modelos.base import CoreModel


class ItemVenda(CoreModel):
    """
    Item financeiro da venda.
    Enterprise-ready:
    - Auditável
    - Soft delete
    - Indexado
    - Integridade garantida
    """
    
    prefixo = "IVEND"

    venda = models.ForeignKey(
        "farmacia.Venda",
        on_delete=models.CASCADE,
        related_name="itens",
        db_index=True,
    )

    produto = models.ForeignKey(
        "farmacia.Produto",
        on_delete=models.PROTECT,
        db_index=True,
    )

    quantidade = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )

    preco_unitario = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    class Meta:
        verbose_name = "Item da Venda"
        verbose_name_plural = "Itens da Venda"

        indexes = [
            models.Index(fields=["venda"]),
            models.Index(fields=["produto"]),
            models.Index(fields=["venda", "produto"]),
        ]

        constraints = [
            # Impede duplicar produto na mesma venda
            models.UniqueConstraint(
                fields=["venda", "produto"],
                condition=Q(deletado=False),
                name="unique_produto_por_venda",
            )
        ]

    # ==========================================
    # TOTAL CALCULADO
    # ==========================================

    @property
    def total_linha(self) -> Decimal:
        return (self.quantidade or 0) * (self.preco_unitario or Decimal("0.00"))

    # ==========================================
    # VALIDAÇÃO
    # ==========================================

    def clean(self):
        super().clean()

        if self.quantidade <= 0:
            raise ValidationError(
                {"quantidade": "Quantidade deve ser maior que zero."}
            )

        if self.preco_unitario < Decimal("0.00"):
            raise ValidationError(
                {"preco_unitario": "Preço unitário inválido."}
            )

    def __str__(self):
        return f"{self.produto} x{self.quantidade}"
