from django.db import models
from .requisicao_exame import RequisicaoExame

class Amostra(models.Model):
    requisicao = models.ForeignKey(RequisicaoExame, on_delete=models.CASCADE)
    tipo = models.CharField(max_length=100)
    codigo_barras = models.CharField(max_length=120, unique=True)

    data_coleta = models.DateTimeField(null=True, blank=True)
    recebida = models.BooleanField(default=False)

    def __str__(self):
        return self.codigo_barras
