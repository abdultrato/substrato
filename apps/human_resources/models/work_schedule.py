from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class WorkSchedule(NoNameCoreModel):
    """
    Horário de trabalho semanal por funcionário (MVP).
    """

    prefix = "HRT"  # Prefixo custom_id

    class DiaSemana(models.IntegerChoices):
        SEGUNDA = 0, "Segunda"
        TERCA = 1, "Terça"
        QUARTA = 2, "Quarta"
        QUINTA = 3, "Quinta"
        SEXTA = 4, "Sexta"
        SABADO = 5, "Sábado"
        DOMINGO = 6, "Domingo"

    employee = models.ForeignKey(  # Funcionário dono do horário
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="horarios",
        db_index=True,
    )

    weekday = models.IntegerField(  # Dia da semana (0-6)
        db_column="weekday",
        verbose_name="Dia da Semana",
        choices=DiaSemana.choices,
        db_index=True,
    )
    start_time = models.TimeField(db_column="start_time", verbose_name="Hora de Início")  # Início do turno
    end_time = models.TimeField(db_column="end_time", verbose_name="Hora de Fim")  # Fim do turno
    active = models.BooleanField(  # Flag para desativar período
        db_column="active",
        verbose_name="Ativo",
        default=True,
        db_index=True,
    )

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
