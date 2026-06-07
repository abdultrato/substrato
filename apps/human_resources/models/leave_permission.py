from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class LeavePermission(NoNameCoreModel):
    """Dispensa temporária autorizada (ex.: consulta médica, saída antecipada)."""

    prefix = "LIC"

    class Status(models.TextChoices):
        REQUESTED = "REQUESTED", "Solicitada"
        APPROVED = "APPROVED", "Aprovada"
        REJECTED = "REJECTED", "Rejeitada"
        USED = "USED", "Utilizada"
        CANCELLED = "CANCELLED", "Cancelada"
        EXPIRED = "EXPIRED", "Expirada"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="licencas",
        db_index=True,
    )
    permission_date = models.DateField(
        db_column="permission_date",
        verbose_name="Data da dispensa",
        default=timezone.now,
        db_index=True,
    )
    start_time = models.TimeField(
        db_column="start_time",
        verbose_name="Hora de saída",
    )
    end_time = models.TimeField(
        db_column="end_time",
        verbose_name="Hora de retorno",
    )
    reason = models.TextField(
        db_column="reason",
        verbose_name="Motivo",
        blank=True,
        default="",
    )
    approved_by = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="approved_by_id",
        verbose_name="Aprovado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="licencas_aprovadas",
    )
    paid_permission = models.BooleanField(
        db_column="paid_permission",
        verbose_name="Dispensa remunerada",
        default=True,
    )
    deduct_from_hours = models.BooleanField(
        db_column="deduct_from_hours",
        verbose_name="Descontar das horas trabalhadas",
        default=False,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=12,
        choices=Status.choices,
        default=Status.REQUESTED,
        db_index=True,
    )

    class Meta:
        db_table = "recursos_humanos_licenca"
        verbose_name = "Dispensa / Licença"
        verbose_name_plural = "Dispensas / Licenças"
        ordering = ["-permission_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "permission_date"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e dispensa devem pertencer ao mesmo tenant."})
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError({"end_time": "Hora de retorno deve ser posterior à hora de saída."})
        if self.approved_by_id and self.tenant_id and self.approved_by.tenant_id != self.tenant_id:
            raise ValidationError({"approved_by": "Aprovador deve pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
