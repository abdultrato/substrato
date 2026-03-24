from django.db import models

from .patient import Patient


class ClinicalHistory(models.Model):
    paciente = models.ForeignKey(Patient, on_delete=models.CASCADE)
    descricao = models.TextField()
    data_evento = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Histórico {self.paciente}"
