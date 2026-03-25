from django.db import models


class NotificationTemplate(models.Model):
    name = models.CharField(db_column="name", max_length=120, unique=True, db_index=True)
    content = models.TextField(
        db_column="content",
        )
    created_at = models.DateTimeField(db_column="created_at", auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notificacoes_templatenotificacao"
        ordering = ["name"]
        verbose_name = "Template de Notificação"
        verbose_name_plural = "Templates de Notificação"

    def __str__(self) -> str:
        return self.name
