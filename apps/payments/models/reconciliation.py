from django.db import models
from django.utils import timezone


class Reconciliation(models.Model):
    transacao = models.OneToOneField(
        "pagamentos.Transaction",
        verbose_name="Transação",
        on_delete=models.CASCADE,
        related_name="reconciliacao",
        db_index=True,
    )

    confirmado = models.BooleanField("Confirmado", default=False, db_index=True)
    data_confirmacao = models.DateTimeField("Data de confirmação", blank=True, null=True)

    criado_em = models.DateTimeField("Criado em", auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Reconciliação"
        verbose_name_plural = "Reconciliações"
        indexes = [
            models.Index(fields=["confirmado"]),
        ]

    def confirm(self):
        self.confirmado = True
        self.data_confirmacao = timezone.now()
        self.save(update_fields=["confirmado", "data_confirmacao"])

    def __str__(self) -> str:
        return f"{self.transacao_id} - {'ok' if self.confirmado else 'pendente'}"


Reconciliation.confirmar = Reconciliation.confirm
