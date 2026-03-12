from django.db import models
from django.utils import timezone


class Reconciliacao(models.Model):
    transacao = models.OneToOneField(
        "pagamentos.Transacao",
        on_delete=models.CASCADE,
        related_name="reconciliacao",
        db_index=True,
    )

    confirmado = models.BooleanField(default=False, db_index=True)
    data_confirmacao = models.DateTimeField(blank=True, null=True)

    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Reconciliação"
        verbose_name_plural = "Reconciliações"
        indexes = [
            models.Index(fields=["confirmado"]),
        ]

    def confirmar(self):
        self.confirmado = True
        self.data_confirmacao = timezone.now()
        self.save(update_fields=["confirmado", "data_confirmacao"])

    def __str__(self) -> str:
        return f"{self.transacao_id} - {'ok' if self.confirmado else 'pendente'}"

