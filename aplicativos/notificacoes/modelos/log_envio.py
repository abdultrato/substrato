from django.db import models
from .notificacao import Notificacao

class LogEnvio(models.Model):
    notificacao = models.ForeignKey(Notificacao, on_delete=models.CASCADE)
    status = models.CharField(max_length=50)
    resposta = models.TextField(blank=True)
    data = models.DateTimeField(auto_now_add=True)
