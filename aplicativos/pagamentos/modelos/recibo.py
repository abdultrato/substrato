from django.db import models

from infrastrutura.orm.fields.dinheiro_field import DinheiroField


class Recibo(models.Model):
    fatura = models.ForeignKey(
        "faturamento.Fatura",
        verbose_name="Fatura",
        on_delete=models.PROTECT,
        related_name="recibos",
        db_index=True,
    )
    pagamento = models.OneToOneField(
        "pagamentos.Pagamento",
        verbose_name="Pagamento",
        on_delete=models.PROTECT,
        related_name="recibo",
        db_index=True,
    )

    numero = models.CharField("Número do recibo", max_length=60, db_index=True)
    valor = DinheiroField(verbose_name="Valor")

    criado_em = models.DateTimeField("Criado em", auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Recibo"
        verbose_name_plural = "Recibos"
        indexes = [
            models.Index(fields=["fatura", "criado_em"]),
            models.Index(fields=["numero"]),
        ]

    def __str__(self) -> str:
        return self.numero
