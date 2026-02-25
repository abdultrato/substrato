from django.db import models as m

from .nucleo import CoreModel as cm
from .fields import MoneyField as mf


class FaturaSeguro(cm):
    """
    Cobertura de seguro aplicada à fatura.

    Permite:
    ✓ múltiplas seguradoras
    ✓ cobertura complementar
    ✓ autorizações médicas
    ✓ coparticipação
    """

    fatura = m.ForeignKey(
        "frontend.Fatura",
        on_delete=m.CASCADE,
        related_name="seguros",
    )

    entidade = m.ForeignKey(
        "frontend.Entidade",
        on_delete=m.PROTECT,
        related_name="coberturas_fatura",
        help_text="Seguradora ou entidade responsável.",
    )

    percentual_cobertura = m.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Percentual coberto por esta entidade.",
    )

    valor_coberto = mf(
        default=0,
        help_text="Valor efetivamente coberto após cálculo.",
    )

    autorizacao = m.CharField(
        max_length=80,
        blank=True,
        help_text="Código de autorização da seguradora.",
    )

    observacoes = m.TextField(blank=True)

    class Meta:
        verbose_name = "Cobertura do Seguro"
        verbose_name_plural = "Coberturas de Seguro"
        unique_together = ("fatura", "entidade")
        indexes = [
            m.Index(fields=["fatura"]),
            m.Index(fields=["entidade"]),
        ]

    def __str__(self):
        return f"{self.entidade} - {self.percentual_cobertura}%"

    # =========================================================
    # VALIDAÇÕES
    # =========================================================

    def clean(self):
        """
        Garante que o percentual seja válido.
        """
        if self.percentual_cobertura < 0:
            raise ValueError("Percentual não pode ser negativo.")

        if self.percentual_cobertura > 100:
            raise ValueError("Percentual não pode ser superior a 100.")

    # =========================================================
    # RECÁLCULO AUTOMÁTICO
    # =========================================================

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

        # recalc totals when coverage changes
        if self.fatura_id:
            self.fatura.recalcular_totais()
