from django.db import models
from .paciente import Paciente

class HistoricoClinico(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE)
    descricao = models.TextField()
    data_evento = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Histórico {self.paciente}"
