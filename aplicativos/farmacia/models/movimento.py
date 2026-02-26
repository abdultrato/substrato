# farmacia/models/movimento_estoque.py

from django.core.validators import MinValueValidator
from django.db import models

from nucleo.modelos.base import CoreModel


class TipoMovimento(models.TextChoices):
    ENTRADA = "ENT", "Entrada"
    SAIDA = "SAI", "Saída"
    AJUSTE = "AJU", "Ajuste"


class MovimentoEstoque(CoreModel):
    """
    Movimento contábil de estoque.
    """

    produto = models.ForeignKey(
        "farmacia.Produto",
        on_delete=models.PROTECT,
        db_index=True,
    )

    lote = models.ForeignKey(
        "farmacia.Lote",
        on_delete=models.PROTECT,
        db_index=True,
    )

    tipo = models.CharField(
        max_length=3,
        choices=TipoMovimento.choices,
        db_index=True,
    )

    quantidade = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )

    class Meta:
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["produto", "criado_em"]),
            models.Index(fields=["lote", "criado_em"]),
        ]

    @property
    def quantidade_assinada(self):
        if self.tipo == TipoMovimento.SAIDA:
            return -self.quantidade
        return self.quantidade

    def __str__(self):
        return f"{self.produto} - {self.tipo} ({self.quantidade})"
