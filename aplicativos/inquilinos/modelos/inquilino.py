from django.db import models


class Inquilino(models.Model):
    nome = models.CharField(max_length=255)
    identificador = models.SlugField(unique=True)

    dominio = models.CharField(max_length=255, blank=True)
    ativo = models.BooleanField(default=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["identificador"]),
            models.Index(fields=["ativo"]),
        ]

    def __str__(self):
        return self.nome
