from django.db import models

from .patient import Patient


class ClinicalHistory(models.Model):
    patient = models.ForeignKey(Patient, 
        db_column="paciente_id",
         on_delete=models.CASCADE)
    description = models.TextField(
        db_column="descricao",
        )
    event_date = models.DateTimeField(
        db_column="data_evento",
        auto_now_add=True)

    class Meta:
        db_table = "clinico_historicoclinico"

    def __str__(self):
        return f"Histórico {self.patient}"
