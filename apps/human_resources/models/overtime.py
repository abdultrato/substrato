from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Overtime(NoNameCoreModel):
    """
    Registro de hours extras (MVP).
    """

    prefix = "HEX"

    employee = models.ForeignKey(

        "recursos_humanos.Employee",

        db_column="employee_id",
        on_delete=models.CASCADE,
        related_name="hours_extras",
        db_index=True,
    )

    date = models.DateField(

        db_column="date",

        default=timezone.now, db_index=True)
    hours = models.DecimalField(
        db_column="hours",
        max_digits=6, decimal_places=2, default=Decimal("0.00"))
    multiplier = models.DecimalField(
        db_column="multiplier",
        max_digits=4, decimal_places=2, default=Decimal("1.50"))
    notes = models.CharField(
        db_column="notes",
        max_length=255, blank=True, default="")

    class Meta:
        db_table = "recursos_humanos_horaextra"
        verbose_name = "Hora Extra"
        verbose_name_plural = "Horas Extras"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "date"]),
        ]

    def clean(self):
        super().clean()

        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e hora extra devem pertencer ao mesmo tenant."})

        if self.hours is not None and self.hours < Decimal("0.00"):
            raise ValidationError({"hours": "Horas inválidas."})

        if self.multiplier is not None and self.multiplier <= Decimal("0.00"):
            raise ValidationError({"multiplier": "Multiplicador inválido."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
