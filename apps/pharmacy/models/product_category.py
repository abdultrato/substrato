"""Modelos de categorias de produtos da farmácia."""

from django.core.exceptions import ValidationError  # Exceções de validação
from django.db import models  # ORM
from django.db.models import Q  # Construção para constraints condicionais

from core.models.base import CoreModel  # Modelo base comum


class ParentCategory(CoreModel):
    """Categoria de nível superior (pai) para agrupar produtos."""

    prefix = "CATGP"  # Prefixo para IDs amigáveis

    description = models.TextField(
        db_column="description",  # Coluna
        verbose_name="Descrição",  # Rótulo
        blank=True,  # Opcional
    )

    class Meta:
        db_table = "farmacia_categoriapai"  # Nome da tabela
        verbose_name = "Categoria Pai"  # Nome legível
        verbose_name_plural = "Categorias Pai"  # Nome plural
        ordering = ["name"]  # Ordenação
        indexes = [  # Índices auxiliares
            models.Index(fields=["deleted"], name="farmacia_ca_deleted_f9118c_idx"),
            models.Index(fields=["version"], name="farmacia_ca_version_1fbd4d_idx"),
            models.Index(fields=["tenant", "name"], name="farmacia_ca_tenant__b288fb_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "name"],  # Nome único por tenant
                condition=Q(deleted=False),  # Ignora registros excluídos logicamente
                name="unique_parent_category_por_tenant",
            )
        ]

    def __str__(self):
        """Retorna apenas o nome para exibição."""
        return self.name


class ProductCategory(CoreModel):
    """Categoria de produto, opcionalmente ligada a uma categoria-pai."""

    prefix = "CATP"  # Prefixo de IDs
    CATEGORIAS_PAI_REFERENCIA = (  # Sugestões iniciais de categorias
        "Medicamentos",
        "Sistema Nervoso",
        "Analgésicos",
        "Outros Analgésicos e Antipiréticos",
        "Anti-infecciosos para Uso Sistêmico",
        "Antibacterianos para Uso Sistêmico",
        "Beta-lactâmicos, Penicilinas",
        "Penicilinas de Espectro Estendido",
    )

    description = models.TextField(
        db_column="description",  # Coluna
        verbose_name="Descrição",  # Rótulo
        blank=True,  # Opcional
    )

    parent_category = models.ForeignKey(
        "farmacia.ParentCategory",  # Categoria pai opcional
        verbose_name="Categoria pai",  # Rótulo
        db_column="parent_category_id",  # Coluna
        null=True,  # Pode ser nulo
        blank=True,  # Opcional em formulários
        on_delete=models.PROTECT,  # Não permitir excluir pai usado
        related_name="subcategorias",  # Nome reverso
        db_index=True,  # Índice
    )

    class Meta:
        db_table = "farmacia_categoriaproduto"  # Nome da tabela
        verbose_name = "Categoria de Produto"  # Nome legível
        verbose_name_plural = "Categorias de Produto"  # Nome plural
        ordering = ["name"]  # Ordenação padrão

        indexes = [
            models.Index(fields=["tenant", "name"]),
            models.Index(fields=["parent_category"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "name"],  # Nome único por tenant
                condition=Q(deleted=False),  # Ignora excluídos logicamente
                name="unique_category_product_por_tenant",
            )
        ]

    # ======================================
    # VALIDAÇÃO
    # ======================================

    def clean(self):
        """Garante consistência da hierarquia (sem ser pai de si mesma)."""

        super().clean()

        # Com ParentCategory não há hierarquia recursiva; validação mantém segurança de dados.
        if self.parent_category and self.parent_category_id == self.id:
            raise ValidationError({"parent_category": "Categoria não pode ser pai de si mesma."})

    # ======================================
    # PROPRIEDADES
    # ======================================

    @property
    def nivel(self):
        """
        Retorna o nível da categoria na hierarquia.
        """
        return 1 if self.parent_category else 0  # 0: raiz; 1: possui pai

    @classmethod
    def parent_category_references(cls):
        """
        Categorias-pai sugeridas para cadastro inicial.
        Não cria registros no banco de dados.
        """
        return cls.CATEGORIAS_PAI_REFERENCIA

    # ======================================
    # REPRESENTAÇÃO
    # ======================================

    def __str__(self):
        """Retorna nome completo com pai (se existir)."""

        if self.parent_category:
            return f"{self.parent_category} / {self.name}"

        return self.name


ProductCategory.categorias_pai_referencia = ProductCategory.parent_category_references
