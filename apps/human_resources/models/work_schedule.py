from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class WorkSchedule(NoNameCoreModel):
    """Horário de trabalho por funcionário."""

    prefix = "HRT"

    class DiaSemana(models.IntegerChoices):
        SEGUNDA = 0, "Segunda"
        TERCA = 1, "Terça"
        QUARTA = 2, "Quarta"
        QUINTA = 3, "Quinta"
        SEXTA = 4, "Sexta"
        SABADO = 5, "Sábado"
        DOMINGO = 6, "Domingo"

    class ScheduleType(models.TextChoices):
        FIXED = "FIXED", "Horário fixo"
        SHIFT = "SHIFT", "Turnos"
        ROTATING = "ROTATING", "Rotativo"
        FLEXIBLE = "FLEXIBLE", "Flexível"
        NIGHT = "NIGHT", "Noturno"
        WEEKEND = "WEEKEND", "Fim de semana"
        ON_CALL = "ON_CALL", "Plantão / On-call"
        PART_TIME = "PART_TIME", "Part-time"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="horarios",
        db_index=True,
    )
    weekday = models.IntegerField(
        db_column="weekday",
        verbose_name="Dia da Semana",
        choices=DiaSemana.choices,
        db_index=True,
    )
    start_time = models.TimeField(db_column="start_time", verbose_name="Hora de Início")
    end_time = models.TimeField(db_column="end_time", verbose_name="Hora de Fim")
    schedule_type = models.CharField(
        db_column="schedule_type",
        verbose_name="Tipo de horário",
        max_length=12,
        choices=ScheduleType.choices,
        default=ScheduleType.FIXED,
        db_index=True,
    )
    shift_name = models.CharField(
        db_column="shift_name",
        verbose_name="Nome do turno",
        max_length=80,
        blank=True,
        default="",
        help_text="Ex.: Turno da Manhã, Turno da Tarde, Noturno.",
    )
    effective_from = models.DateField(
        db_column="effective_from",
        verbose_name="Vigente a partir de",
        null=True,
        blank=True,
        db_index=True,
    )
    effective_until = models.DateField(
        db_column="effective_until",
        verbose_name="Vigente até",
        null=True,
        blank=True,
        db_index=True,
    )
    active = models.BooleanField(
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
            models.Index(fields=["tenant", "schedule_type"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e horário devem pertencer ao mesmo tenant."})
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError({"end_time": "Hora fim deve ser maior que hora início."})
        if self.effective_from and self.effective_until and self.effective_from > self.effective_until:
            raise ValidationError({"effective_until": "A data de fim de vigência não pode ser anterior à data de início."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
