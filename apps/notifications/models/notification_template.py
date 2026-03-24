from django.db import models


class NotificationTemplate(models.Model):
    nome = models.CharField(max_length=120, unique=True, db_index=True)
    conteudo = models.TextField()
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Template de Notificação"
        verbose_name_plural = "Templates de Notificação"

    def __str__(self) -> str:
        return self.nome
