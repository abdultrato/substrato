from django.db import models

class TemplateNotificacao(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    conteudo = models.TextField()

    def __str__(self):
        return self.nome
