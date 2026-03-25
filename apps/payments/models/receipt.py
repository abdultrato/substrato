from django.db import models

from infrastructure.orm.fields.money_field import MoneyField


class Receipt(models.Model):
    invoice = models.ForeignKey(
        "faturamento.Invoice",
        db_column="invoice_id",
        verbose_name="Fatura",
        on_delete=models.PROTECT,
        related_name="recibos",
        db_index=True,
    )
    payment = models.OneToOneField(
        "pagamentos.Payment",
        db_column="payment_id",
        verbose_name="Pagamento",
        on_delete=models.PROTECT,
        related_name="recibo",
        db_index=True,
    )

    number = models.CharField("Número do recibo", 

        db_column="number",

         max_length=60, db_index=True)
    value = MoneyField(
        db_column="value",
        verbose_name="Valor")

    created_at = models.DateTimeField("Criado em", db_column="created_at", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "pagamentos_recibo"
        ordering = ["-created_at"]
        verbose_name = "Recibo"
        verbose_name_plural = "Recibos"
        indexes = [
            models.Index(fields=["invoice", "created_at"]),
            models.Index(fields=["number"]),
        ]

    def __str__(self) -> str:
        return self.number

