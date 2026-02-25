from django.db import models

from frontend.fields import MoneyField
from frontend.models.core import CoreModel


class Recibo(CoreModel):
    """
    Comprovante financeiro emitido após um pagamento.

    Pode existir múltiplos recibos para uma mesma fatura,
    dependendo dos pagamentos realizados.
    """

    fatura = models.ForeignKey(
        "billing.Fatura",
        on_delete=models.CASCADE,
        related_name="recibos",
    )

    pagamento = models.ForeignKey(
        "payments.Pagamento",
        on_delete=models.PROTECT,
        related_name="recibos",
    )

    numero = models.CharField(
        max_length=30,
        unique=True,
        help_text="Número único do recibo.",
    )

    valor = MoneyField()

    emitido_em = models.DateTimeField(
        auto_now_add=True,
        help_text="Data/hora de emissão do recibo.",
    )

    class Meta:
        verbose_name = "Recibo"
        verbose_name_plural = "Recibos"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["fatura"]),
            models.Index(fields=["numero"]),
            models.Index(fields=["criado_em"]),
        ]

    def __str__(self):
        return f"Recibo {self.numero}"

    def save(self, *args, **kwargs):
        """
        Garante que o valor do recibo corresponda ao pagamento.
        """
        if self.pagamento and not self.valor:
            self.valor = self.pagamento.valor

        super().save(*args, **kwargs)
