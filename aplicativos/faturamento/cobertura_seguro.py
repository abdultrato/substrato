from django.db import models
from .tabela_precos import TabelaPrecos

class CoberturaSeguro(models.Model):
    nome_seguro = models.CharField(max_length=255)
    procedimento = models.ForeignKey(TabelaPrecos, on_delete=models.CASCADE)

    percentual_cobertura = models.DecimalField(max_digits=5, decimal_places=2)

    def __str__(self):
        return self.nome_seguro
