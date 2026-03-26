from django.db import models

from .patient import Patient


class ClinicalHistory(models.Model):
    patient = models.ForeignKey(
        Patient,
        verbose_name="Paciente",
        db_column="patient_id",
        on_delete=models.CASCADE,
    )
    description = models.TextField(
        db_column="description",
        verbose_name="Descrição",
        )
    event_date = models.DateTimeField(
        db_column="event_date",
        verbose_name="Data do evento",
        auto_now_add=True)

    class Meta:
        db_table = "clinico_historicoclinico"
        verbose_name = "Histórico clínico"
        verbose_name_plural = "Históricos clínicos"

    def __str__(self):
        return f"Histórico {self.patient}"
