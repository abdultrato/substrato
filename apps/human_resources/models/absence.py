from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Absence(NoNameCoreModel):
    """Registo de faltas/ausências."""

    prefix = "FLT"

    class AbsenceType(models.TextChoices):
        UNJUSTIFIED = "UNJUSTIFIED", "Injustificada"
        JUSTIFIED = "JUSTIFIED", "Justificada"
        MEDICAL = "MEDICAL", "Médica"
        MATERNITY = "MATERNITY", "Maternidade"
        PATERNITY = "PATERNITY", "Paternidade"
        BEREAVEMENT = "BEREAVEMENT", "Falecimento de familiar"
        STUDY = "STUDY", "Estudo / Formação"
        SICK = "SICK", "Doença"
        SUSPENSION = "SUSPENSION", "Suspensão disciplinar"
        OTHER = "OTHER", "Outra"

    class Status(models.TextChoices):
        REPORTED = "REPORTED", "Registada"
        PENDING_JUSTIFICATION = "PENDING_JUSTIFICATION", "Pendente de justificação"
        JUSTIFIED = "JUSTIFIED", "Justificada"
        UNJUSTIFIED = "UNJUSTIFIED", "Injustificada"
        APPROVED = "APPROVED", "Aprovada"
        REJECTED = "REJECTED", "Rejeitada"
        DEDUCTED = "DEDUCTED", "Descontada"
        CANCELLED = "CANCELLED", "Cancelada"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        on_delete=models.CASCADE,
        related_name="faltas",
        db_index=True,
    )
    # Campo legado — data única (mantido para compat com payroll)
    date = models.DateField(
        db_column="date",
        default=timezone.now,
        db_index=True,
    )
    # Suporte multi-dia
    start_date = models.DateField(
        db_column="start_date",
        verbose_name="Data de início",
        null=True,
        blank=True,
        db_index=True,
    )
    end_date = models.DateField(
        db_column="end_date",
        verbose_name="Data de fim",
        null=True,
        blank=True,
        db_index=True,
    )
    absence_type = models.CharField(
        db_column="absence_type",
        verbose_name="Tipo de falta",
        max_length=24,
        choices=AbsenceType.choices,
        default=AbsenceType.UNJUSTIFIED,
        db_index=True,
    )
    reason = models.CharField(
        db_column="reason",
        max_length=255,
        blank=True,
        default="",
    )
    # Campo legado (boolean simples) — mantido; status é o campo canónico
    justified = models.BooleanField(
        db_column="justified",
        default=False,
        db_index=True,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=24,
        choices=Status.choices,
        default=Status.REPORTED,
        db_index=True,
    )
    deduct_from_salary = models.BooleanField(
        db_column="deduct_from_salary",
        verbose_name="Descontar do salário",
        default=True,
    )
    deduct_from_vacation = models.BooleanField(
        db_column="deduct_from_vacation",
        verbose_name="Descontar das férias",
        default=False,
    )
    document_attached = models.BooleanField(
        db_column="document_attached",
        verbose_name="Documento anexado",
        default=False,
    )

    class Meta:
        db_table = "recursos_humanos_falta"
        verbose_name = "Falta"
        verbose_name_plural = "Faltas"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "date"]),
            models.Index(fields=["tenant", "justified", "date"]),
            models.Index(fields=["tenant", "absence_type", "date"]),
            models.Index(fields=["tenant", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e falta devem pertencer ao mesmo tenant."})
        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError({"end_date": "Data de fim não pode ser anterior à data de início."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        # Sincroniza campo legado justified com o status
        if self.status in {self.Status.JUSTIFIED, self.Status.APPROVED}:
            self.justified = True
        elif self.status in {self.Status.UNJUSTIFIED, self.Status.REJECTED, self.Status.DEDUCTED}:
            self.justified = False
        self.full_clean()
        return super().save(*args, **kwargs)

    # ------------------------------------------------------------------ #
    # Ciclo de justificação da falta (§29.16)
    # ------------------------------------------------------------------ #
    def submit_justification(self, *, reason: str = ""):
        """Funcionário submete justificação (registada → pendente de justificação)."""
        if self.status not in {self.Status.REPORTED, self.Status.PENDING_JUSTIFICATION}:
            raise ValidationError("Apenas faltas registadas podem ser justificadas.")
        if reason:
            self.reason = reason
        self.status = self.Status.PENDING_JUSTIFICATION
        self.save()
        return self

    def approve_justification(self):
        """Gestor aprova a justificação (pendente → justificada)."""
        if self.status != self.Status.PENDING_JUSTIFICATION:
            raise ValidationError("Apenas faltas pendentes de justificação podem ser aprovadas.")
        self.status = self.Status.JUSTIFIED  # save() sincroniza justified=True
        self.save()
        return self

    def reject_justification(self):
        """Gestor rejeita a justificação (pendente → injustificada)."""
        if self.status != self.Status.PENDING_JUSTIFICATION:
            raise ValidationError("Apenas faltas pendentes de justificação podem ser rejeitadas.")
        self.status = self.Status.UNJUSTIFIED  # save() sincroniza justified=False
        self.save()
        return self
