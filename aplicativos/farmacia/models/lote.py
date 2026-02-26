# farmacia/models/lote.py

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from nucleo.modelos.base import CoreModel


class Lote(CoreModel):
    """
    Lote farmacêutico imutável.
    Não armazena saldo.
    """

    produto = models.ForeignKey(
        "farmacia.Produto",
        on_delete=models.PROTECT,
        related_name="lotes",
        db_index=True,
    )

    numero_lote = models.CharField(max_length=100, db_index=True)

    validade = models.DateField(db_index=True)

    quantidade_inicial = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )

    class Meta:
        ordering = ["validade"]
        constraints = [
            models.UniqueConstraint(
                fields=["produto", "numero_lote"],
                condition=models.Q(deletado=False),
                name="unique_lote_produto",
            ),
        ]
        indexes = [
            models.Index(fields=["produto", "validade"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk:
            original = Lote.all_objects.get(pk=self.pk)
            if original.quantidade_inicial != self.quantidade_inicial:
                raise ValidationError(
                    "Quantidade inicial do lote é imutável."
                )
        super().save(*args, **kwargs)

    @property
    def vencido(self):
        return self.validade < timezone.localdate()

    def __str__(self):
        return f"{self.produto} - Lote {self.numero_lote}"
