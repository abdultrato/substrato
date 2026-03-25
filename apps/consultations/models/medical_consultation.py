from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.consultations.utils.pricing import (
    calculate_price_multiplier,
    calculate_schedule_type,
    get_local_datetime,
    get_tenant_timezone,
    is_holiday,
)
from core.models.base import NoNameCoreModel
from infrastructure.orm.fields.money_field import MoneyField


class MedicalConsultation(NoNameCoreModel):
    """
    App comercial: consultations médicas (marcação + record).

    - Relaciona patient e médico
    - Guarda preço da consultation
    - Permite vincular faturamento (via Fatura.origin=CONSULTA)
    """

    prefix = "CONS"

    class Status(models.TextChoices):
        SCHEDULED = "MARCADA", "Marcada"
        COMPLETED = "CONCLUIDA", "Concluída"
        CANCELED = "CANCELADA", "Cancelada"

    class ScheduleType(models.TextChoices):
        NORMAL = "NORMAL", "Normal (08h-18h)"
        AFTER_HOURS = "FORA_EXPEDIENTE", "Fora de expediente (19h-07h)"
        WEEKEND = "FIM_SEMANA", "Fim de semana"
        MANUAL_HOLIDAY = "FERIADO_MANUAL", "Feriado (marcado)"

    patient = models.ForeignKey(

        "clinico.Patient",

        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="consultations_medicas",
        db_index=True,
    )
    doctor = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="doctor_id",
        verbose_name="Médico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="consultations_realizadas",
        db_index=True,
    )

    specialty = models.ForeignKey(

        "consultas.ConsultationSpecialty",

        db_column="specialty_id",
        verbose_name="Especialidade",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="consultations",
        db_index=True,
    )

    type = models.CharField("Tipo de consultation",

        db_column="type",

         max_length=120, db_index=True)
    description = models.TextField("Descrição",
        db_column="description",
         blank=True, default="")

    scheduled_for = models.DateTimeField("Agendada para",

        db_column="scheduled_for",

         default=timezone.now, db_index=True)
    status = models.CharField(
        "Estado",
        db_column="status",
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        db_index=True,
    )

    price = MoneyField("Preço",

        db_column="price",

         default=Decimal("0.00"))
    price_multiplier = models.DecimalField(
        "Multiplicador de preço",
        db_column="price_multiplier",
        max_digits=5,
        decimal_places=2,
        default=Decimal("1.00"),
        help_text="Fator aplicado sobre o preço base conforme horário/feriado.",
    )
    schedule_type = models.CharField(
        "Tipo de horário",
        db_column="schedule_type",
        max_length=32,
        choices=ScheduleType.choices,
        default=ScheduleType.NORMAL,
        db_index=True,
    )
    manual_holiday = models.BooleanField(
        "Feriado (manual)",
        db_column="manual_holiday",
        default=False,
        help_text="Marque se a date for feriado mesmo não sendo fim de semana.",
    )

    completed_at = models.DateTimeField("Concluída em",

        db_column="completed_at",

         null=True, blank=True)
    canceled_at = models.DateTimeField("Cancelada em",
        db_column="canceled_at",
         null=True, blank=True)

    class Meta:
        db_table = "consultas_consultamedica"
        verbose_name = "Consulta Médica"
        verbose_name_plural = "Consultas Médicas"
        ordering = ["-scheduled_for", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "patient", "scheduled_for"]),
            models.Index(fields=["tenant", "doctor", "scheduled_for"]),
            models.Index(fields=["tenant", "status", "scheduled_for"]),
            models.Index(fields=["tenant", "type"]),
        ]

    def clean(self):
        super().clean()

        if not (self.type or "").strip():
            raise ValidationError({"type": "Informe o type/name do serviço da consultation."})

        if self.price is None or self.price < Decimal("0.00"):
            raise ValidationError({"price": "Preço inválido."})

        if self.price_multiplier is None or self.price_multiplier <= Decimal("0.00"):
            raise ValidationError({"price_multiplier": "Multiplicador inválido."})

        if self.patient_id and self.tenant_id and self.patient.tenant_id != self.tenant_id:
            raise ValidationError({"patient": "Paciente e consultation devem pertencer ao mesmo tenant."})

        if self.doctor_id and self.tenant_id and self.doctor.tenant_id != self.tenant_id:
            raise ValidationError({"doctor": "Médico e consultation devem pertencer ao mesmo tenant."})

        if self.specialty_id and self.tenant_id and self.specialty.tenant_id != self.tenant_id:
            raise ValidationError({"specialty": "Especialidade e consultation devem pertencer ao mesmo tenant."})

    def _tenant_timezone(self):
        """
        Retorna ZoneInfo do tenant (ou None para timezone default).
        """
        return get_tenant_timezone(self.tenant)

    def _is_holiday(self) -> bool:
        return is_holiday(self.tenant, self.scheduled_for)

    def _tenant_local_datetime(self):
        return get_local_datetime(self.tenant, self.scheduled_for)

    def _current_schedule_type(self) -> str:
        return calculate_schedule_type(self.tenant, self.scheduled_for, manual_holiday=self.manual_holiday)

    def _current_price_multiplier(self) -> Decimal:
        return calculate_price_multiplier(self.tenant, self.scheduled_for, manual_holiday=self.manual_holiday)

    def _sync_specialty_and_price(self, update_fields: set[str] | None = None) -> None:
        """
        Se houver specialty, sincroniza:
        - type = specialty.name
        - schedule_type + multiplier conforme date/hora/feriado manual
        - price = base_price * multiplier
        """
        if not self.specialty_id:
            return

        specialty = getattr(self, "specialty", None)
        if not specialty:
            return

        self.type = (specialty.name or "").strip()

        base = specialty.base_price if specialty.base_price is not None else Decimal("0.00")

        self.schedule_type = self._current_schedule_type()
        self.price_multiplier = self._current_price_multiplier()

        try:
            final = (base * self.price_multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        except Exception:
            final = base

        self.price = final

        if update_fields is not None:
            update_fields.update({"type", "price", "schedule_type", "price_multiplier"})

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        update_set: set[str] | None = set(update_fields) if update_fields else None

        if not self.tenant_id and self.patient_id:
            self.tenant_id = self.patient.tenant_id
            if update_set is not None:
                update_set.add("tenant")

        self._sync_specialty_and_price(update_set)

        if update_set is not None:
            kwargs["update_fields"] = list(update_set)

        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.custom_id} - {self.patient.name} ({self.type})"

