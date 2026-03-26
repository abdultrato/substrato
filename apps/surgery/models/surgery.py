from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField

User = settings.AUTH_USER_MODEL


class Surgery(NoNameCoreModel):
    """
    Registro de surgery (MVP).

    Inclui agendamento e status básico. Pode ser expandido com equipe,
    sala cirúrgica, checklists, anestesia, materiais, etc.
    """

    prefix = "CIR"

    class Status(models.TextChoices):
        SCHEDULED = "AGENDADA", "Agendada"
        IN_PROGRESS = "EM_ANDAMENTO", "Em andamento"
        COMPLETED = "CONCLUIDA", "Concluída"
        CANCELED = "CANCELADA", "Cancelada"

    patient = models.ForeignKey(

        "clinical.Patient",

        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="cirurgias",
        db_index=True,
    )
    surgeon = models.ForeignKey(
        User,
        db_column="surgeon_id",
        verbose_name="Cirurgião",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cirurgias_realizadas",
        db_index=True,
    )

    procedures = models.ManyToManyField(

        "cirurgia.SurgicalProcedure",

        db_table="cirurgia_cirurgia_procedimentos",
        verbose_name="Procedimentos cirúrgicos",
        blank=True,
        related_name="cirurgias",
    )

    procedure = models.CharField(

        db_column="procedure",

        verbose_name="Procedimento (texto livre)",
        max_length=160,
        blank=True,
        default="",
        db_index=True,
        help_text="Use quando o procedure não estiver no catálogo.",
    )
    description = models.TextField(
        db_column="description",
        verbose_name="Descrição", blank=True, default="")

    estimated_price = MoneyField(

        db_column="estimated_price",

        verbose_name="Preço estimado", default=Decimal("0.00"))
    vat_percentage = models.DecimalField(
        db_column="vat_percentage",
        verbose_name="IVA (%)", max_digits=5, decimal_places=2, default=Decimal("16.00"))
    applies_vat_by_default = models.BooleanField(
        db_column="applies_vat_by_default",
        verbose_name="Aplicar IVA por padrão", default=True)

    scheduled_for = models.DateTimeField(

        db_column="scheduled_for",

        verbose_name="Agendada para", default=timezone.now, db_index=True)
    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        db_index=True,
    )

    completed_at = models.DateTimeField(

        db_column="completed_at",

        verbose_name="Concluída em", null=True, blank=True)
    canceled_at = models.DateTimeField(
        db_column="canceled_at",
        verbose_name="Cancelada em", null=True, blank=True)

    class Meta:
        db_table = "cirurgia_cirurgia"
        verbose_name = "Cirurgia"
        verbose_name_plural = "Cirurgias"
        ordering = ["-scheduled_for", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "scheduled_for"]),
            models.Index(fields=["tenant", "surgeon", "scheduled_for"]),
            models.Index(fields=["tenant", "status", "scheduled_for"]),
        ]

    def clean(self):
        super().clean()

        has_free_text_procedure = bool((self.procedure or "").strip())
        has_catalog_procedures = bool(self.pk and self.procedures.exists())

        if not has_catalog_procedures and not has_free_text_procedure:
            raise ValidationError(
                {"procedures": "Informe ao menos um procedure cirúrgico (catálogo) ou preencha o texto livre."}
            )

        if self.patient_id and self.tenant_id and self.patient.tenant_id != self.tenant_id:
            raise ValidationError({"patient": "Paciente e surgery devem pertencer ao mesmo tenant."})

        if self.surgeon_id and self.tenant_id and self.surgeon.tenant_id != self.tenant_id:
            raise ValidationError({"surgeon": "Cirurgião e surgery devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.patient_id:
            self.tenant_id = self.patient.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Cirurgia {self.pk}"
