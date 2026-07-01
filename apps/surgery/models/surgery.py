from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel
from core.models.managers import ManagerAtivo
from infrastructure.orm.fields.money_field import MoneyField

User = settings.AUTH_USER_MODEL


class SurgeryTypeManager(ManagerAtivo):
    surgery_size: str | None = None

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.surgery_size:
            queryset = queryset.filter(surgery_size=self.surgery_size)
        return queryset


class Surgery(NoNameCoreModel):
    """Caso cirúrgico principal, com agenda, equipa, sala, consumos e faturação."""

    prefix = "CIR"
    LEGACY_FIELD_ALIASES = {
        "porte_cirurgia": "surgery_size",
        "tipo_cirurgia": "surgery_size",
    }

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Rascunho"
        REQUESTED = "REQUESTED", "Solicitada"
        UNDER_ASSESSMENT = "UNDER_ASSESSMENT", "Em avaliação"
        FINANCIAL_PENDING = "FINANCIAL_PENDING", "Financeiro pendente"
        AUTHORIZED = "AUTHORIZED", "Autorizada"
        SCHEDULED = "AGENDADA", "Agendada"
        PATIENT_CHECKED_IN = "PATIENT_CHECKED_IN", "Paciente em check-in"
        PREOPERATIVE_PREPARATION = "PREOPERATIVE_PREPARATION", "Preparação pré-operatória"
        PREPARED = "PREPARED", "Preparada"
        IN_OPERATING_ROOM = "IN_OPERATING_ROOM", "Em sala operatória"
        ANESTHESIA_STARTED = "ANESTHESIA_STARTED", "Anestesia iniciada"
        SURGERY_STARTED = "SURGERY_STARTED", "Cirurgia iniciada"
        IN_PROGRESS = "EM_ANDAMENTO", "Em andamento"
        SURGERY_COMPLETED = "SURGERY_COMPLETED", "Cirurgia concluída"
        COMPLETED = "CONCLUIDA", "Concluída"
        IN_RECOVERY = "IN_RECOVERY", "Em recuperação"
        RECOVERED = "RECOVERED", "Recuperado"
        REPORT_PENDING = "REPORT_PENDING", "Relatório pendente"
        BILLING_PENDING = "BILLING_PENDING", "Faturação pendente"
        CLOSED = "CLOSED", "Fechada"
        POSTPONED = "POSTPONED", "Adiada"
        CANCELED = "CANCELADA", "Cancelada"

    class Size(models.TextChoices):
        SMALL = "PEQUENA", "Pequena"
        LARGE = "GRANDE", "Grande"

    class Priority(models.TextChoices):
        ELECTIVE = "ELECTIVE", "Eletiva"
        URGENT = "URGENT", "Urgente"
        EMERGENCY = "EMERGENCY", "Emergência"

    class Classification(models.TextChoices):
        MINOR = "MINOR", "Pequena cirurgia"
        MAJOR = "MAJOR", "Grande cirurgia"
        ELECTIVE = "ELECTIVE", "Eletiva"
        EMERGENCY = "EMERGENCY", "Emergência"
        AMBULATORY = "AMBULATORY", "Ambulatória"
        INPATIENT = "INPATIENT", "Com internamento"
        DAY_SURGERY = "DAY_SURGERY", "Cirurgia de dia"

    patient = models.ForeignKey(

        "clinical.Patient",

        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="cirurgias",
        db_index=True,
    )
    surgical_request = models.ForeignKey(
        "cirurgia.SurgicalRequest",
        db_column="surgical_request_id",
        verbose_name="Pedido cirúrgico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="surgeries",
        db_index=True,
    )
    specialty = models.ForeignKey(
        "consultas.ConsultationSpecialty",
        db_column="specialty_id",
        verbose_name="Especialidade",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="surgeries",
        db_index=True,
    )
    surgeon = models.ForeignKey(
        User,
        db_column="surgeon_id",
        verbose_name="Cirurgião principal (legado)",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cirurgias_realizadas",
        db_index=True,
    )
    surgeons = models.ManyToManyField(
        User,
        verbose_name="Cirurgiões",
        blank=True,
        related_name="cirurgias_como_cirurgiao",
    )
    operating_room = models.ForeignKey(
        "cirurgia.OperatingRoom",
        db_column="operating_room_id",
        verbose_name="Sala operatória",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="surgeries",
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
    preoperative_diagnosis = models.TextField(
        db_column="preoperative_diagnosis",
        verbose_name="Diagnóstico pré-operatório",
        blank=True,
        default="",
    )
    postoperative_diagnosis = models.TextField(
        db_column="postoperative_diagnosis",
        verbose_name="Diagnóstico pós-operatório",
        blank=True,
        default="",
    )

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
        max_length=32,
        choices=Status.choices,
        default=Status.SCHEDULED,
        db_index=True,
    )
    surgery_size = models.CharField(
        db_column="surgery_size",
        verbose_name="Porte da cirurgia",
        max_length=10,
        choices=Size.choices,
        default=Size.SMALL,
        db_index=True,
    )
    priority = models.CharField(
        db_column="priority",
        verbose_name="Prioridade",
        max_length=16,
        choices=Priority.choices,
        default=Priority.ELECTIVE,
        db_index=True,
    )
    classification = models.CharField(
        db_column="classification",
        verbose_name="Classificação",
        max_length=24,
        choices=Classification.choices,
        default=Classification.MINOR,
        db_index=True,
    )

    started_at = models.DateTimeField(
        db_column="started_at",
        verbose_name="Iniciada em",
        null=True,
        blank=True,
        db_index=True,
    )
    ended_at = models.DateTimeField(
        db_column="ended_at",
        verbose_name="Terminada em",
        null=True,
        blank=True,
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
            models.Index(fields=["tenant", "surgery_size", "scheduled_for"]),
            models.Index(fields=["tenant", "priority", "scheduled_for"]),
            models.Index(fields=["tenant", "classification", "scheduled_for"]),
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
            raise ValidationError({"patient": "Paciente e cirurgia devem pertencer ao mesmo tenant."})

        if self.surgeon_id and self.tenant_id and self.surgeon.tenant_id != self.tenant_id:
            raise ValidationError({"surgeon": "Cirurgião principal e cirurgia devem pertencer ao mesmo tenant."})
        if self.surgical_request_id and self.tenant_id and self.surgical_request.tenant_id != self.tenant_id:
            raise ValidationError({"surgical_request": "Pedido cirúrgico e cirurgia devem pertencer ao mesmo tenant."})
        if self.surgical_request_id and self.patient_id != self.surgical_request.patient_id:
            raise ValidationError({"patient": "Paciente e pedido cirúrgico devem corresponder."})
        if self.specialty_id and self.tenant_id and self.specialty.tenant_id != self.tenant_id:
            raise ValidationError({"specialty": "Especialidade e cirurgia devem pertencer ao mesmo tenant."})
        if self.operating_room_id and self.tenant_id and self.operating_room.tenant_id != self.tenant_id:
            raise ValidationError({"operating_room": "Sala operatória e cirurgia devem pertencer ao mesmo tenant."})
        if self.ended_at and self.started_at and self.ended_at < self.started_at:
            raise ValidationError({"ended_at": "O fim não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.patient_id:
            self.tenant_id = self.patient.tenant_id
        if self.surgical_request_id:
            if not self.specialty_id:
                self.specialty_id = self.surgical_request.specialty_id
            if not (self.procedure or "").strip():
                self.procedure = self.surgical_request.requested_procedure[:160]
            if not (self.preoperative_diagnosis or "").strip():
                self.preoperative_diagnosis = self.surgical_request.clinical_diagnosis
            if self.priority == self.Priority.ELECTIVE:
                self.priority = self.surgical_request.priority
        if self.classification == self.Classification.MINOR and self.surgery_size == self.Size.LARGE:
            self.classification = self.Classification.MAJOR
        elif self.classification == self.Classification.MAJOR and self.surgery_size == self.Size.SMALL:
            self.classification = self.Classification.MINOR
        if self.status in {self.Status.SURGERY_STARTED, self.Status.IN_PROGRESS} and not self.started_at:
            self.started_at = timezone.now()
        if self.status in {self.Status.SURGERY_COMPLETED, self.Status.COMPLETED, self.Status.CLOSED} and not self.ended_at:
            self.ended_at = timezone.now()
        if self.status in {self.Status.SURGERY_COMPLETED, self.Status.COMPLETED, self.Status.CLOSED} and not self.completed_at:
            self.completed_at = timezone.now()
        if self.status == self.Status.CANCELED and not self.canceled_at:
            self.canceled_at = timezone.now()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Cirurgia {self.pk}"


class SmallSurgeryManager(SurgeryTypeManager):
    surgery_size = Surgery.Size.SMALL


class LargeSurgeryManager(SurgeryTypeManager):
    surgery_size = Surgery.Size.LARGE


class SmallSurgery(Surgery):
    objects = SmallSurgeryManager()

    class Meta:
        proxy = True
        verbose_name = "Pequena cirurgia"
        verbose_name_plural = "Pequenas cirurgias"

    def save(self, *args, **kwargs):
        self.surgery_size = Surgery.Size.SMALL
        return super().save(*args, **kwargs)


class LargeSurgery(Surgery):
    objects = LargeSurgeryManager()

    class Meta:
        proxy = True
        verbose_name = "Grande cirurgia"
        verbose_name_plural = "Grandes cirurgias"

    def save(self, *args, **kwargs):
        self.surgery_size = Surgery.Size.LARGE
        return super().save(*args, **kwargs)
