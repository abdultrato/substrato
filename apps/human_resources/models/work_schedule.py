from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class WorkSchedule(NoNameCoreModel):
    """
    Horário de trabalho semanal por funcionário (MVP).
    """

    prefix = "HRT"

    class DiaSemana(models.IntegerChoices):
        SEGUNDA = 0, "Segunda"
        TERCA = 1, "Terça"
        QUARTA = 2, "Quarta"
        QUINTA = 3, "Quinta"
        SEXTA = 4, "Sexta"
        SABADO = 5, "Sábado"
        DOMINGO = 6, "Domingo"

    employee = models.ForeignKey(

        "recursos_humanos.Employee",

        db_column="employee_id",
        on_delete=models.CASCADE,
        related_name="horarios",
        db_index=True,
    )

    weekday = models.IntegerField(

        db_column="weekday",

        choices=DiaSemana.choices, db_index=True)
    start_time = models.TimeField(
        db_column="start_time",
        )
    end_time = models.TimeField(
        db_column="end_time",
        )
    active = models.BooleanField(
        db_column="active",
        default=True, db_index=True)

    class Meta:
        db_table = "recursos_humanos_horariotrabalho"
        verbose_name = "Horário de Trabalho"
        verbose_name_plural = "Horários de Trabalho"
        ordering = ["employee", "weekday", "start_time"]
        indexes = [
            models.Index(fields=["tenant", "employee", "weekday"]),
        ]

    def clean(self):
        super().clean()

        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e horário devem pertencer ao mesmo tenant."})

        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError({"end_time": "Hora fim deve ser maior que hora início."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
