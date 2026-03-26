from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.models.base import CoreModel


class ProductCategory(CoreModel):
    prefix = "CATP"
    CATEGORIAS_PAI_REFERENCIA = (
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
        db_column="description",
        verbose_name="Descrição",
        blank=True,
    )

    parent_category = models.ForeignKey(
        "self",
        verbose_name="Categoria pai",
        db_column="parent_category_id",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="subcategorias",
        db_index=True,
    )

    class Meta:
        db_table = "farmacia_categoriaproduto"
        verbose_name = "Categoria de Produto"
        verbose_name_plural = "Categorias de Produto"
        ordering = ["name"]

        indexes = [
            models.Index(fields=["tenant", "name"]),
            models.Index(fields=["parent_category"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "name"],
                condition=Q(deleted=False),
                name="unique_category_product_por_tenant",
            )
        ]

    # ======================================
    # VALIDAÇÃO
    # ======================================

    def clean(self):

        super().clean()

        if self.parent_category and self.parent_category_id == self.id:
            raise ValidationError({"parent_category": "Categoria não pode ser pai de si mesma."})

    # ======================================
    # PROPRIEDADES
    # ======================================

    @property
    def nivel(self):
        """
        Retorna o nível da category na hierarquia.
        """
        nivel = 0
        pai = self.parent_category

        while pai:
            nivel += 1
            pai = pai.parent_category

        return nivel

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

        if self.parent_category:
            return f"{self.parent_category} / {self.name}"

        return self.name


ProductCategory.categorias_pai_referencia = ProductCategory.parent_category_references
