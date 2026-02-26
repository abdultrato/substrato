from django.db import models


class Pagamento(models.Model):

    fatura = models.ForeignKey(
        "faturamento.Fatura",
        on_delete=models.PROTECT,
        related_name="pagamentos",
    )

    valor = models.DecimalField(max_digits=12, decimal_places=2)

    metodo = models.CharField(max_length=50)

    confirmado = models.BooleanField(default=False)

    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["confirmado"]),
        ]

    def __str__(self):
        return f"Pagamento {self.id} - {self.valor}"
