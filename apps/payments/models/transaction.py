from django.db import models


class Transaction(models.Model):
    external_reference = models.CharField("Referência externa", 
        db_column="external_reference",
         max_length=120, db_index=True)
    gateway = models.CharField("Gateway", max_length=80, db_index=True)
    status = models.CharField("Status do gateway", max_length=40, db_index=True)
    gateway_response = models.TextField("Resposta do gateway", 
        db_column="gateway_response",
         blank=True, default="")

    created_at = models.DateTimeField("Criado em", db_column="created_at", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "pagamentos_transacao"
        ordering = ["-created_at"]
        verbose_name = "Transação"
        verbose_name_plural = "Transações"
        indexes = [
            models.Index(fields=["external_reference"]),
            models.Index(fields=["gateway", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.gateway}:{self.external_reference}"
