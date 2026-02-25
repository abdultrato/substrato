from django.db import models

from frontend.fields import MoneyField
from frontend.models.core import CoreModel


class Pagamento(CoreModel):
    """
    Registro de pagamento vinculado a uma fatura.

    Suporta múltiplos métodos e múltiplos pagamentos por fatura.
    """

    class Metodo(models.TextChoices):
        DINHEIRO = "DIN", "Dinheiro"
        CARTAO = "CAR", "Cartão"
        TRANSFERENCIA = "TRF", "Transferência"
        MOBILE_MONEY = "MOB", "Mobile Money"
        POS = "POS", "POS"
        CHEQUE = "CHQ", "Cheque"
        OUTRO = "OUT", "Outro"

    fatura = models.ForeignKey(
        "billing.Fatura",
        on_delete=models.CASCADE,
        related_name="pagamentos",
    )

    metodo = models.CharField(
        max_length=4,
        choices=Metodo.choices,
    )

    valor = MoneyField()

    referencia = models.CharField(
        max_length=120,
        blank=True,
        help_text="Referência externa (transação, autorização, etc).",
    )

    confirmado = models.BooleanField(
        default=True,
        help_text="Indica se o pagamento foi confirmado.",
    )

    pago_em = models.DateTimeField(
        auto_now_add=True,
        help_text="Data/hora do registro do pagamento.",
    )

    class Meta:
        verbose_name = "Pagamento"
        verbose_name_plural = "Pagamentos"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["fatura"]),
            models.Index(fields=["metodo"]),
            models.Index(fields=["confirmado"]),
            models.Index(fields=["criado_em"]),
        ]

    def __str__(self):
        return f"{self.get_metodo_display()} - {self.valor}"

    def save(self, *args, **kwargs):
        """
        Após salvar, atualiza o estado financeiro da fatura.
        """
        super().save(*args, **kwargs)

        if self.fatura_id:
            self.fatura.atualizar_estado_pagamento()
