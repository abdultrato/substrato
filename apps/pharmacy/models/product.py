"""Modelos de produtos da farmácia com cálculo de estoque e preços.

Os comentários a seguir explicam linha a linha o papel de cada instrução
para facilitar a leitura e a manutenção em português.
"""

from decimal import Decimal  # Suporte a valores monetários com precisão fixa

from django.core.validators import MaxValueValidator, MinValueValidator  # Validadores numéricos
from django.db import models  # Ferramentas de modelagem do Django

from core.models.base import CoreModel  # Modelo base comum com campos de auditoria
from apps.pharmacy import utils  # Funções utilitárias de estoque


class Product(CoreModel):
    """Representa um produto vendido/gerido na farmácia."""

    prefix = "PROD"  # Prefixo usado na geração de IDs amigáveis

    class ProductType(models.TextChoices):
        """Tipos de produto aceitos na aplicação."""

        MEDICAMENTO = "MED", "Medicamento"
        MATERIAL = "MAT", "Material"
        OUTRO = "OUT", "Outro"

    category = models.ForeignKey(
        "farmacia.ProductCategory",  # Tabela de categorias de produto
        db_column="category_id",  # Nome da coluna no banco
        verbose_name="Categoria",  # Rótulo exibido no admin
        on_delete=models.PROTECT,  # Impede exclusão se houver dependência
        related_name="produtos",  # Nome do relacionamento reverso
        null=True,  # Campo opcional
        blank=True,  # Permite formulário em branco
        db_index=True,  # Índice para acelerar buscas
    )

    type = models.CharField(
        db_column="type",  # Nome da coluna
        verbose_name="Tipo",  # Label exibido
        max_length=3,  # Tamanho do código (MED/MAT/OUT)
        choices=ProductType.choices,  # Limita aos valores definidos
        default=ProductType.OUTRO,  # Seleção padrão
        db_index=True,  # Índice para filtros por tipo
    )

    sale_price = models.DecimalField(
        db_column="sale_price",  # Nome da coluna
        verbose_name="Preço de Venda",  # Rótulo no admin
        max_digits=14,  # Dígitos totais permitidos
        decimal_places=2,  # Casas decimais
        default=Decimal("0.00"),  # Valor inicial
        validators=[MinValueValidator(Decimal("0.00"))],  # Não permite valor negativo
    )

    vat_percentage = models.DecimalField(
        db_column="vat_percentage",  # Coluna de IVA
        verbose_name="IVA (%)",  # Rótulo
        max_digits=5,  # Dígitos totais (permite 100.00)
        decimal_places=2,  # Casas decimais
        default=Decimal("16.00"),  # Percentual padrão
        validators=[  # Regras de validação
            MinValueValidator(Decimal("0.00")),  # Não permite menor que 0%
            MaxValueValidator(Decimal("100.00")),  # Nem maior que 100%
        ],
        help_text="Taxa de IVA aplicada ao produto (0 a 100).",  # Texto de ajuda
    )

    applies_vat_by_default = models.BooleanField(
        db_column="applies_vat_by_default",  # Coluna booleana
        verbose_name="Aplicar IVA por padrão",  # Rótulo
        default=True,  # Assume que aplica IVA
        help_text="Desmarque se este produto normalmente não deve ter IVA.",  # Ajuda
    )

    class Meta:
        db_table = "farmacia_produto"  # Nome da tabela
        verbose_name = "Produto"  # Nome legível
        verbose_name_plural = "Produtos"  # Nome plural
        ordering = ["name"]  # Ordenação padrão
        indexes = [  # Índices adicionais para desempenho
            models.Index(fields=["tenant", "name"]),
            models.Index(fields=["category"]),
            models.Index(fields=["type"]),
        ]

    def __str__(self) -> str:
        """Retorna representação legível para administração e logs."""
        return self.name or f"Produto {self.pk}"

    # =========================================
    # ESTOQUE
    # =========================================

    @property
    def initial_stock(self) -> int:
        """
        Soma das quantidades iniciais de todos os lotes (ignora movimentações).
        """
        return utils.calculate_initial_stock(self)  # Delegação para utilitário

    @property
    def inventory_total(self) -> int:
        """
        Estoque atual = entradas - saídas (via movimentos) + quantidades iniciais.
        """
        return utils.calculate_current_stock(self)  # Reuso da lógica centralizada
