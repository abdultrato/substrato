from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Vacation(NoNameCoreModel):
    """
    Registo de férias (MVP).
    """

    prefix = "FER"  # Prefixo custom_id

    class Status(models.TextChoices):
        REQUESTED = "SOLIC", "Solicitada"
        APPROVED = "APROV", "Aprovada"
        TAKEN = "GOZADA", "Gozada"
        CANCELED = "CANCEL", "Cancelada"

    employee = models.ForeignKey(  # Funcionário que goza férias
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="ferias",
        db_index=True,
    )

    start_date = models.DateField(  # Início das férias
        db_column="start_date",
        verbose_name="Data de Início",
        default=timezone.now,
        db_index=True,
    )
    end_date = models.DateField(  # Fim das férias
        db_column="end_date",
        verbose_name="Data de Fim",
        default=timezone.now,
        db_index=True,
    )
    status = models.CharField(  # Estado do pedido
        db_column="status",
        verbose_name="Estado",
        max_length=10,
        choices=Status.choices,
        default=Status.REQUESTED,
        db_index=True,
    )
    notes = models.TextField(  # Observações/justificativa
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )

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
