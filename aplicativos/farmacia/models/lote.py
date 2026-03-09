from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Case, F, IntegerField, Sum, When
from django.db.models.functions import Coalesce
from django.utils import timezone

from nucleo.modelos.base import CoreModel


class Lote(CoreModel):

    prefixo = "LOTE"

    produto = models.ForeignKey(
        "farmacia.Produto",
        on_delete=models.PROTECT,
        related_name="lotes",
        db_index=True,
    )

    numero_lote = models.CharField(
        max_length=100,
        db_index=True,
    )

    validade = models.DateField(
        db_index=True,
    )

    quantidade_inicial = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Quantidade inicial do lote.",
    )

    class Meta:

        ordering = ["validade"]

        constraints = [
            models.UniqueConstraint(
                fields=["produto", "numero_lote"],
                condition=models.Q(deletado=False),
                name="unique_lote_produto",
            )
        ]

        indexes = [
            models.Index(fields=["produto", "validade"]),
            models.Index(fields=["validade"]),
        ]

    # =====================================================
    # IMUTABILIDADE
    # =====================================================

    def save(self, *args, **kwargs):

        if self.pk:

            original = Lote.all_objects.get(pk=self.pk)

            if original.quantidade_inicial != self.quantidade_inicial:
                raise ValidationError("Quantidade inicial do lote é imutável.")

            if original.numero_lote != self.numero_lote:
                raise ValidationError("Número do lote não pode ser alterado.")

        super().save(*args, **kwargs)

    # =====================================================
    # PROPRIEDADES
    # =====================================================

    @property
    def vencido(self):

        return self.validade < timezone.localdate()

    # =====================================================
    # SALDO
    # =====================================================

    def saldo(self):

        movimentos = self.movimentos.aggregate(
            total=Coalesce(
                Sum(
                    Case(
                        When(
                            tipo="SAI",
                            then=-F("quantidade"),
                        ),
                        default=F("quantidade"),
                        output_field=IntegerField(),
                    )
                ),
                0,
            )
        )["total"]

        return self.quantidade_inicial + movimentos

    # =====================================================
    # QUERY FEFO
    # =====================================================

    @classmethod
    def disponiveis(cls, produto):

        hoje = timezone.localdate()

        return (
            cls.objects.filter(
                produto=produto,
                validade__gte=hoje,
            )
            .annotate(
                saldo=F("quantidade_inicial")
                + Coalesce(
                    Sum(
                        Case(
                            When(
                                movimentos__tipo="SAI",
                                then=-F("movimentos__quantidade"),
                            ),
                            default=F("movimentos__quantidade"),
                            output_field=IntegerField(),
                        )
                    ),
                    0,
                )
            )
            .filter(saldo__gt=0)
            .order_by("validade")
        )

    def __str__(self):

        return f"{self.produto} - Lote {self.numero_lote}"
