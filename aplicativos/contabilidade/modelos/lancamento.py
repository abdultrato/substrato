from django.db import models

class Lancamento(models.Model):
    descricao = models.CharField(max_length=255)
    data = models.DateTimeField(auto_now_add=True)

    referencia_externa = models.CharField(
        max_length=120,
        blank=True
    )

    def __str__(self):
        return self.descricao
