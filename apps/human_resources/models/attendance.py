from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class PresenceRecord(NoNameCoreModel):
    """Registo diário de presença e horas trabalhadas."""

    prefix = "ASS"

    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Presente"
        LATE = "LATE", "Presente (com atraso)"
        ABSENT = "ABSENT", "Ausente"
        HALF_DAY = "HALF_DAY", "Meio dia"
        ON_LEAVE = "ON_LEAVE", "De licença"
        ON_VACATION = "ON_VACATION", "De férias"
        ON_PERMISSION = "ON_PERMISSION", "Dispensado"
        HOLIDAY = "HOLIDAY", "Feriado"
        WEEKEND = "WEEKEND", "Fim de semana"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="registos_presenca",
        db_index=True,
    )
    date = models.DateField(
        db_column="date",
        verbose_name="Data",
        default=timezone.now,
        db_index=True,
    )
    clock_in = models.TimeField(
        db_column="clock_in",
        verbose_name="Hora de entrada",
        null=True,
        blank=True,
    )
    clock_out = models.TimeField(
        db_column="clock_out",
        verbose_name="Hora de saída",
        null=True,
        blank=True,
    )
    expected_start = models.TimeField(
        db_column="expected_start",
        verbose_name="Entrada prevista",
        null=True,
        blank=True,
    )
    expected_end = models.TimeField(
        db_column="expected_end",
        verbose_name="Saída prevista",
        null=True,
        blank=True,
    )
    late_minutes = models.PositiveSmallIntegerField(
        db_column="late_minutes",
        verbose_name="Minutos de atraso",
        default=0,
    )
    early_leave_minutes = models.PositiveSmallIntegerField(
        db_column="early_leave_minutes",
        verbose_name="Minutos de saída antecipada",
        default=0,
    )
    worked_hours = models.DecimalField(
        db_column="worked_hours",
        verbose_name="Horas trabalhadas",
        max_digits=5,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=16,
        choices=Status.choices,
        default=Status.PRESENT,
        db_index=True,
    )
    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "recursos_humanos_assiduidade"
        verbose_name = "Registo de Assiduidade"
        verbose_name_plural = "Registos de Assiduidade"
        ordering = ["-date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "employee", "date"],
                name="uq_attendance_employee_date",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "employee", "date"]),
            models.Index(fields=["tenant", "status", "date"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e registo de assiduidade devem pertencer ao mesmo tenant."})
        if self.clock_in and self.clock_out and self.clock_in >= self.clock_out:
            raise ValidationError({"clock_out": "Hora de saída deve ser posterior à hora de entrada."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
