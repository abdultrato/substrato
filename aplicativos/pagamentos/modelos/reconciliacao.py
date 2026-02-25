from django.db import models
from .transacao import Transacao

class Reconciliacao(models.Model):
    transacao = models.ForeignKey(Transacao, on_delete=models.CASCADE)
    confirmado = models.BooleanField(default=False)
    data_confirmacao = models.DateTimeField(null=True, blank=True)
