from django.db import models


class DeliveryLog(models.Model):
    notification = models.ForeignKey(
        "notificacoes.Notification",
        verbose_name="Notificação",
        db_column="notification_id",
        on_delete=models.CASCADE,
        related_name="logs_envio",
        db_index=True,
    )
    status = models.CharField("Status", max_length=40, db_index=True)
    response = models.TextField(
        db_column="response",
        verbose_name="Resposta",
        blank=True, default="")

    created_at = models.DateTimeField(
        db_column="created_at",
        verbose_name="Criado em",
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        db_table = "notificacoes_logenvio"
        ordering = ["-created_at"]
        verbose_name = "Log de Envio"
        verbose_name_plural = "Logs de Envio"
        indexes = [
            models.Index(fields=["notification", "created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.status} - {self.notification_id}"
