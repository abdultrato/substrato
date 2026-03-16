from django.db import models


class Transacao(models.Model):
    referencia_externa = models.CharField(max_length=120, db_index=True)
    gateway = models.CharField(max_length=80, db_index=True)
    status = models.CharField(max_length=40, db_index=True)
    resposta_gateway = models.TextField(blank=True, default="")

    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Transação"
        verbose_name_plural = "Transações"
        indexes = [
            models.Index(fields=["referencia_externa"]),
            models.Index(fields=["gateway", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.gateway}:{self.referencia_externa}"
