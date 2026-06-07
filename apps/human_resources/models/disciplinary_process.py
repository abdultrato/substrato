from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class DisciplinaryProcess(NoNameCoreModel):
    """Processo disciplinar associado ao funcionário."""

    prefix = "PDC"

    class Severity(models.TextChoices):
        LIGHT = "LEVE", "Leve"
        MODERATE = "MODERADA", "Moderada"
        SERIOUS = "GRAVE", "Grave"
        CRITICAL = "GRAVISSIMA", "Gravíssima"

    class Status(models.TextChoices):
        OPEN = "ABERTO", "Aberto"
        UNDER_INVESTIGATION = "EM_INVESTIGACAO", "Em investigação"
        NOTIFIED = "NOTIFICADO", "Funcionário notificado"
        HEARING_SCHEDULED = "AUDIENCIA_MARCADA", "Audiência marcada"
        AWAITING_DECISION = "AGUARDANDO_DECISAO", "Aguardando decisão"
        SANCTION_APPLIED = "SANCAO_APLICADA", "Sanção aplicada"
        CLOSED = "ENCERRADO", "Encerrado"
        CANCELLED = "CANCELADO", "Cancelado"
        APPEALED = "RECORRIDO", "Recorrido"

    class Sanction(models.TextChoices):
        PENDING = "PENDING", "Pendente"
        NO_SANCTION = "NO_SANCTION", "Sem sanção"
        VERBAL_WARNING = "VERBAL_WARNING", "Advertência verbal"
        WRITTEN_WARNING = "WRITTEN_WARNING", "Advertência escrita"
        SUSPENSION = "SUSPENSION", "Suspensão"
        SALARY_DEDUCTION = "SALARY_DEDUCTION", "Desconto salarial"
        TRANSFER = "TRANSFER", "Transferência"
        TERMINATION = "TERMINATION", "Despedimento"

    employee = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="employee_id",
        verbose_name="Funcionário",
        on_delete=models.CASCADE,
        related_name="processos_disciplinares",
        db_index=True,
    )
    incident_date = models.DateField(
        db_column="incident_date",
        verbose_name="Data do incidente",
        default=timezone.now,
        db_index=True,
    )
    incident_type = models.CharField(
        db_column="incident_type",
        verbose_name="Tipo de incidente",
        max_length=120,
        blank=True,
        default="",
    )
    reported_by = models.CharField(
        db_column="reported_by",
        verbose_name="Reportado por",
        max_length=120,
        blank=True,
        default="",
    )
    severity = models.CharField(
        db_column="severity",
        verbose_name="Gravidade",
        max_length=12,
        choices=Severity.choices,
        default=Severity.MODERATE,
        db_index=True,
    )
    description = models.TextField(
        db_column="description",
        verbose_name="Descrição",
        blank=True,
        default="",
    )
    hearing_date = models.DateField(
        db_column="hearing_date",
        verbose_name="Data da audiência",
        null=True,
        blank=True,
        db_index=True,
    )
    decision = models.TextField(
        db_column="decision",
        verbose_name="Decisão",
        blank=True,
        default="",
    )
    action_taken = models.TextField(
        db_column="action_taken",
        verbose_name="Ação disciplinar aplicada",
        blank=True,
        default="",
    )
    sanction = models.CharField(
        db_column="sanction",
        verbose_name="Sanção",
        max_length=20,
        choices=Sanction.choices,
        default=Sanction.PENDING,
        db_index=True,
    )
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    resolved_at = models.DateField(
        db_column="resolved_at",
        verbose_name="Data de encerramento",
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
        db_table = "recursos_humanos_processodisciplinar"
        verbose_name = "Processo Disciplinar"
        verbose_name_plural = "Processos Disciplinares"
        ordering = ["-incident_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "employee", "incident_date"]),
            models.Index(fields=["tenant", "status", "incident_date"]),
            models.Index(fields=["tenant", "severity"]),
            models.Index(fields=["tenant", "sanction"]),
        ]

    def clean(self):
        super().clean()
        if self.employee_id and self.tenant_id and self.employee.tenant_id != self.tenant_id:
            raise ValidationError({"employee": "Funcionário e processo disciplinar devem pertencer ao mesmo tenant."})
        if self.status in {self.Status.CLOSED, self.Status.SANCTION_APPLIED} and not self.resolved_at:
            raise ValidationError({"resolved_at": "Data de encerramento é obrigatória para processo encerrado."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.employee_id:
            self.tenant_id = self.employee.tenant_id
        if self.status in {self.Status.CLOSED, self.Status.SANCTION_APPLIED} and not self.resolved_at:
            self.resolved_at = timezone.localdate()
        elif self.status == self.Status.OPEN:
            self.resolved_at = None
        self.full_clean()
        return super().save(*args, **kwargs)
