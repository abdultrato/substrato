from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Vacation(NoNameCoreModel):
    """
    Registo de férias (MVP).
    """

    prefix = "FER"

    class Estado(models.TextChoices):
        SOLICITADA = "SOLIC", "Solicitada"
        APROVADA = "APROV", "Aprovada"
        GOZADA = "GOZADA", "Gozada"
        CANCELADA = "CANCEL", "Cancelada"

    employee = models.ForeignKey(

        "recursos_humanos.Employee",

        db_column="funcionario_id",
        on_delete=models.CASCADE,
        related_name="ferias",
        db_index=True,
    )

    start_date = models.DateField(

        db_column="data_inicio",

        default=timezone.now, db_index=True)
    end_date = models.DateField(
        db_column="data_fim",
        default=timezone.now, db_index=True)
    status = models.CharField(
        db_column="estado",
        max_length=10,
        choices=Estado.choices,
        default=Estado.SOLICITADA,
        db_index=True,
    )
    notes = models.TextField(
        db_column="observacoes",
        blank=True, default="")

    class Meta:
        db_table = "recursos_humanos_ferias"
        verbose_name = "Férias"
        verbose_name_plural = "Férias"
        ordering = ["-start_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "start_date"]),
            models.Index(fields=["tenant", "status", "start_date"]),
        ]

    def clean(self):
        super().clean()

        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e férias devem pertencer ao mesmo tenant."})

        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({"end_date": "Data fim deve ser maior ou igual a date início."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
