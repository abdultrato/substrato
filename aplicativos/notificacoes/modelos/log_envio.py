from django.db import models


class LogEnvio(models.Model):

    notificacao = models.ForeignKey(
        "notificacoes.Notificacao",
        on_delete=models.CASCADE,
        related_name="logs",
    )

    status = models.CharField(max_length=50)
    resposta = models.TextField(blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["criado_em"]),
        ]

    def __str__(self):
        return f"{self.notificacao_id} - {self.status}"
