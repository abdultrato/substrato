from django.db import models


class Recibo(models.Model):

    fatura = models.ForeignKey(
        "faturamento.Fatura",
        on_delete=models.CASCADE,
        related_name="recibos",
    )

    pagamento = models.ForeignKey(
        "pagamentos.Pagamento",
        on_delete=models.PROTECT,
        related_name="recibos",
    )

    numero = models.CharField(max_length=50, unique=True)

    valor = models.DecimalField(max_digits=12, decimal_places=2)

    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["numero"]),
        ]

    def __str__(self):
        return f"Recibo {self.numero}"
