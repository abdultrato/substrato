from django.db import models

class Transacao(models.Model):
    referencia_externa = models.CharField(max_length=120, unique=True)
    gateway = models.CharField(max_length=50)

    status = models.CharField(max_length=30, default="pendente")
    resposta_gateway = models.JSONField(null=True, blank=True)

    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.referencia_externa
