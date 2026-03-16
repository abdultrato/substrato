from django.db import models


class LogEnvio(models.Model):
    notificacao = models.ForeignKey(
        "notificacoes.Notificacao",
        on_delete=models.CASCADE,
        related_name="logs_envio",
        db_index=True,
    )
    status = models.CharField(max_length=40, db_index=True)
    resposta = models.TextField(blank=True, default="")

    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Log de Envio"
        verbose_name_plural = "Logs de Envio"
        indexes = [
            models.Index(fields=["notificacao", "criado_em"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.status} - {self.notificacao_id}"
