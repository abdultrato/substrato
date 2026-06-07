from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Vacation(NoNameCoreModel):
    """Pedido e controlo de férias."""

    prefix = "FER"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        REQUESTED = "SOLIC", "Solicitada"
        UNDER_REVIEW = "EM_ANALISE", "Em análise"
        APPROVED = "APROV", "Aprovada"
        REJECTED = "REJEIT", "Rejeitada"
        TAKEN = "GOZADA", "Gozada"
        INTERRUPTED = "INTERROMPIDA", "Interrompida"
        CANCELED = "CANCEL", "Cancelada"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="ferias",
        db_index=True,
    )
    vacation_year = models.PositiveSmallIntegerField(
        db_column="vacation_year",
        verbose_name="Ano de referência das férias",
        null=True,
        blank=True,
        db_index=True,
    )
    start_date = models.DateField(
        db_column="start_date",
        verbose_name="Data de Início",
        default=timezone.now,
        db_index=True,
    )
    end_date = models.DateField(
        db_column="end_date",
        verbose_name="Data de Fim",
        default=timezone.now,
        db_index=True,
    )
    total_days = models.PositiveSmallIntegerField(
        db_column="total_days",
        verbose_name="Total de dias",
        default=0,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=15,
        choices=Status.choices,
        default=Status.REQUESTED,
        db_index=True,
    )
    approved_by = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="approved_by_id",
        verbose_name="Aprovado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ferias_aprovadas",
    )
    approved_at = models.DateTimeField(
        db_column="approved_at",
        verbose_name="Aprovado em",
        null=True,
        blank=True,
    )
    notes = models.TextField(
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
            models.Index(fields=["tenant", "vacation_year"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e férias devem pertencer ao mesmo tenant."})
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({"end_date": "Data fim deve ser maior ou igual à data de início."})
        if self.approved_by_id and self.tenant_id and self.approved_by.tenant_id != self.tenant_id:
            raise ValidationError({"approved_by": "Aprovador deve pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        # Calcular total_days automaticamente
        if self.start_date and self.end_date:
            delta = (self.end_date - self.start_date).days + 1
            self.total_days = max(delta, 0)
        if not self.vacation_year and self.start_date:
            self.vacation_year = self.start_date.year
        self.full_clean()
        return super().save(*args, **kwargs)
