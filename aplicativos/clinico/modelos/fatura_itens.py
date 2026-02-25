from decimal import Decimal as d

from django.db import models as m

from .nucleo import CoreModel as cm
from .exame import Exame as e
from .fatura import Fatura as f
from .fields import MoneyField as mf


class FaturaItem(cm):
    """
    Item faturável vinculado à fatura.

    Representa um serviço/exame cobrado.
    O IVA é calculado individualmente por item.
    """

    fatura = m.ForeignKey(
        f,
        on_delete=m.CASCADE,
        related_name="itens",
    )

    exame = m.ForeignKey(
        e,
        on_delete=m.PROTECT,
    )

    descricao = m.CharField(
        max_length=200,
        blank=True,
        help_text="Descrição personalizada (opcional)",
    )

    quantidade = m.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=d("1.00"),
    )

    preco_unitario = mf()

    isento_iva = m.BooleanField(
        default=False,
        help_text="Marcar se este item estiver isento de IVA.",
    )

    class Meta:
        verbose_name = "Item da Fatura"
        verbose_name_plural = "Itens da Fatura"
        ordering = ["id"]
        unique_together = ("fatura", "exame")
        indexes = [
            m.Index(fields=["fatura"]),
        ]

    def __str__(self):
        return f"{self.descricao or self.exame.nome} ({self.quantidade}x)"

    # =========================================================
    # VALORES CALCULADOS
    # =========================================================

    @property
    def total_linha(self):
        """
        Valor total do item sem IVA.
        """
        return (self.quantidade * self.preco_unitario).quantize(d("0.01"))

    # =========================================================
    # AUTO-PREENCHIMENTO
    # =========================================================

    def save(self, *args, **kwargs):
        """
        Garante consistência ao salvar.
        """

        if self.exame and not self.descricao:
            self.descricao = self.exame.nome

        if self.exame and not self.preco_unitario:
            self.preco_unitario = self.exame.preco

        super().save(*args, **kwargs)

        # Atualiza totais da fatura automaticamente
        if self.fatura_id:
            self.fatura.recalcular_totais()
