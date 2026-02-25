from django.db import models

class TabelaPrecos(models.Model):
    nome_procedimento = models.CharField(max_length=255)
    preco = models.DecimalField(max_digits=10, decimal_places=2)

    ativo = models.BooleanField(default=True)

    def __str__(self):
        return self.nome_procedimento
