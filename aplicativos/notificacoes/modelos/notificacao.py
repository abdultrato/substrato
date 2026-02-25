from django.db import models

class Notificacao(models.Model):
    destinatario = models.CharField(max_length=255)
    canal = models.CharField(max_length=50)

    mensagem = models.TextField()

    enviada = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.canal} -> {self.destinatario}"
