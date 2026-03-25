from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Absence(NoNameCoreModel):
    """
    Registro de faltas/ausências (MVP).
    """

    prefix = "FLT"

    employee = models.ForeignKey(

        "recursos_humanos.Employee",

        db_column="funcionario_id",
        on_delete=models.CASCADE,
        related_name="faltas",
        db_index=True,
    )

    date = models.DateField(

        db_column="data",

        default=timezone.now, db_index=True)
    reason = models.CharField(
        db_column="motivo",
        max_length=255, blank=True, default="")
    justified = models.BooleanField(
        db_column="justificada",
        default=False, db_index=True)

    class Meta:
        db_table = "recursos_humanos_falta"
        verbose_name = "Falta"
        verbose_name_plural = "Faltas"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "date"]),
            models.Index(fields=["tenant", "justified", "date"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e falta devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
