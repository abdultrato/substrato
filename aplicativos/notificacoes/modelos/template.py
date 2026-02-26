from django.db import models


class TemplateNotificacao(models.Model):

    nome = models.CharField(max_length=100, unique=True)
    conteudo = models.TextField()

    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]

    def __str__(self):
        return self.nome
