from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class Overtime(NoNameCoreModel):
    """Registo e aprovação de horas extras."""

    prefix = "HEX"

    class Kind(models.TextChoices):
        ORDINARY = "ORDINARIA", "Ordinária"
        EXTRAORDINARY = "EXTRAORDINARIA", "Extraordinária"

    class OvertimeType(models.TextChoices):
        NORMAL = "NORMAL", "Normal"
        NIGHT = "NIGHT", "Noturna"
        WEEKEND = "WEEKEND", "Fim de semana"
        HOLIDAY = "HOLIDAY", "Feriado"
        EMERGENCY = "EMERGENCY", "Emergência"
        ON_CALL = "ON_CALL", "Plantão / On-call"

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        REQUESTED = "REQUESTED", "Solicitada"
        APPROVED = "APPROVED", "Aprovada"
        REJECTED = "REJECTED", "Rejeitada"
        PROCESSED = "PROCESSED", "Processada em folha"
        CANCELLED = "CANCELLED", "Cancelada"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="hours_extras",
        db_index=True,
    )
    date = models.DateField(
        db_column="date",
        verbose_name="Data",
        default=timezone.now,
        db_index=True,
    )
    kind = models.CharField(
        db_column="kind",
        verbose_name="Tipo de Hora",
        max_length=20,
        choices=Kind.choices,
        default=Kind.EXTRAORDINARY,
        db_index=True,
    )
    overtime_type = models.CharField(
        db_column="overtime_type",
        verbose_name="Classificação",
        max_length=12,
        choices=OvertimeType.choices,
        default=OvertimeType.NORMAL,
        db_index=True,
    )
    hours = models.DecimalField(
        db_column="hours",
        verbose_name="Horas",
        max_digits=6,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    multiplier = models.DecimalField(
        db_column="multiplier",
        verbose_name="Multiplicador",
        max_digits=4,
        decimal_places=2,
        default=Decimal("1.50"),
    )
    amount = MoneyField(
        db_column="amount",
        verbose_name="Valor calculado",
        default=Decimal("0.00"),
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=12,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    approved_by = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="approved_by_id",
        verbose_name="Aprovado por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="horas_extras_aprovadas",
    )
    approved_at = models.DateTimeField(
        db_column="approved_at",
        verbose_name="Aprovado em",
        null=True,
        blank=True,
    )
    notes = models.CharField(
        db_column="notes",
        verbose_name="Observações",
        max_length=255,
        blank=True,
        default="",
    )

    class Meta:
        db_table = "recursos_humanos_horaextra"
        verbose_name = "Hora Extra"
        verbose_name_plural = "Horas Extras"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "date"]),
            models.Index(fields=["tenant", "kind", "date"]),
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["tenant", "overtime_type"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e hora extra devem pertencer ao mesmo tenant."})
        if self.hours is not None and self.hours < Decimal("0.00"):
            raise ValidationError({"hours": "Horas inválidas."})
        if self.multiplier is not None and self.multiplier <= Decimal("0.00"):
            raise ValidationError({"multiplier": "Multiplicador inválido."})
        if self.approved_by_id and self.tenant_id and self.approved_by.tenant_id != self.tenant_id:
            raise ValidationError({"approved_by": "Aprovador deve pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)
