from django.db import models
from .fatura import Fatura

class HistoricoFatura(models.Model):
    fatura = models.ForeignKey(Fatura, on_delete=models.CASCADE)
    descricao = models.TextField()
    data_evento = models.DateTimeField(auto_now_add=True)
