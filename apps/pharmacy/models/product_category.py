from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.models.base import CoreModel


class ProductCategory(CoreModel):
    prefixo = "CATP"
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

    descricao = models.TextField(
        blank=True,
    )

    categoria_pai = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="subcategorias",
        db_index=True,
    )

    class Meta:
        ordering = ["nome"]

        indexes = [
            models.Index(fields=["inquilino", "nome"]),
            models.Index(fields=["categoria_pai"]),
        ]

        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "nome"],
                condition=Q(deletado=False),
                name="unique_categoria_produto_por_inquilino",
            )
        ]

    # ======================================
    # VALIDAÇÃO
    # ======================================

    def clean(self):

        super().clean()

        if self.categoria_pai and self.categoria_pai_id == self.id:
            raise ValidationError({"categoria_pai": "Categoria não pode ser pai de si mesma."})

    # ======================================
    # PROPRIEDADES
    # ======================================

    @property
    def nivel(self):
        """
        Retorna o nível da categoria na hierarquia.
        """
        nivel = 0
        pai = self.categoria_pai

        while pai:
            nivel += 1
            pai = pai.categoria_pai

        return nivel

    @classmethod
    def categorias_pai_referencia(cls):
        """
        Categorias-pai sugeridas para cadastro inicial.
        Não cria registros no banco de dados.
        """
        return cls.CATEGORIAS_PAI_REFERENCIA

    # ======================================
    # REPRESENTAÇÃO
    # ======================================

    def __str__(self):

        if self.categoria_pai:
            return f"{self.categoria_pai} / {self.nome}"

        return self.nome
