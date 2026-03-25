from django.db import models
from django.utils import timezone


class Reconciliation(models.Model):
    transaction = models.OneToOneField(
        "pagamentos.Transaction",
        db_column="transacao_id",
        verbose_name="Transação",
        on_delete=models.CASCADE,
        related_name="reconciliacao",
        db_index=True,
    )

    confirmed = models.BooleanField("Confirmado", 

        db_column="confirmado",

         default=False, db_index=True)
    confirmation_date = models.DateTimeField("Data de confirmação", 
        db_column="data_confirmacao",
         blank=True, null=True)

    created_at = models.DateTimeField("Criado em", db_column="criado_em", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "pagamentos_reconciliacao"
        ordering = ["-created_at"]
        verbose_name = "Reconciliação"
        verbose_name_plural = "Reconciliações"
        indexes = [
            models.Index(fields=["confirmed"]),
        ]

    def confirm(self):
        self.confirmed = True
        self.confirmation_date = timezone.now()
        self.save(update_fields=["confirmed", "confirmation_date"])

    def __str__(self) -> str:
        return f"{self.transaction_id} - {'ok' if self.confirmed else 'pendente'}"

