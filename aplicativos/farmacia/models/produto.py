from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils.translation import gettext_lazy as _

from nucleo.modelos.base import CoreModel


class Produto(CoreModel):

    prefixo = "PRODT"

    categoria = models.ForeignKey(
        "farmacia.CategoriaProduto",
        on_delete=models.PROTECT,
        related_name="produtos",
        db_index=True,
    )

    preco_venda = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text=_("Preço padrão de venda."),
    )

    estoque_minimo = models.PositiveIntegerField(
        default=0,
        help_text=_("Quantidade mínima recomendada em estoque."),
    )

    class Meta:

        ordering = ["nome", "criado_em"]

        indexes = [
            models.Index(fields=["inquilino", "nome"]),
            models.Index(fields=["inquilino", "categoria"]),
            models.Index(fields=["categoria"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "id_custom"],
                condition=Q(deletado=False),
                name="unique_codigo_produto_por_inquilino",
            )
        ]

    # =====================================================
    # VALIDAÇÃO
    # =====================================================

    def clean(self):

        super().clean()

        if self.preco_venda is None:
            raise ValidationError({"preco_venda": "Preço de venda é obrigatório."})

        if self.preco_venda < Decimal("0.00"):
            raise ValidationError({"preco_venda": "Preço de venda inválido."})

    # =====================================================
    # CONSULTAS DE ESTOQUE
    # =====================================================

    def possui_estoque(self):
        """
        Verifica se há lote com saldo positivo.
        """
        from aplicativos.farmacia.models import Lote

        return Lote.disponiveis(self).exists()

    def estoque_baixo(self):
        """
        Verifica se o estoque está abaixo do mínimo.
        """
        from aplicativos.farmacia.models import Lote

        total = 0
        for lote in Lote.disponiveis(self):
            total += lote.saldo()

        return total <= self.estoque_minimo

    # =====================================================
    # REPRESENTAÇÃO
    # =====================================================

    def __str__(self):
        return f"{self.id_custom} - {self.nome}"
