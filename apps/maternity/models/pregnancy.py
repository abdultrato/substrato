from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class Pregnancy(NoNameCoreModel):
    """
    Acompanhamento básico de gestação (MVP).

    Campos e regras podem ser expandidos (pré-natal, exams, partos, etc.).
    """

    prefix = "MAT"

    class Status(models.TextChoices):
        FOLLOW_UP = "ACOMP", "Em acompanhamento"
        DELIVERY = "PARTO", "Parto performed"
        CLOSED = "ENCERR", "Encerrada"
        CANCELED = "CANCEL", "Cancelada"

    patient = models.ForeignKey(

        "clinico.Patient",

        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="gestacoes",
        db_index=True,
    )
    responsible_doctor = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="responsible_doctor_id",
        verbose_name="Médico/Ginecologista responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gestacoes_responsible",
        db_index=True,
    )

    last_menstrual_period_date = models.DateField(

        db_column="last_menstrual_period_date",

        verbose_name="Data da última menstruação",
        null=True,
        blank=True,
    )
    expected_delivery_date = models.DateField(
        db_column="expected_delivery_date",
        verbose_name="Data prevista do parto",
        null=True,
        blank=True,
    )

    nursery = models.CharField(

        db_column="nursery",

        verbose_name="Berçário",
        max_length=80,
        blank=True,
        default="",
        help_text="Identificação do berçário/ala/sala (quando aplicável).",
    )
    maternity_bed = models.CharField(
        db_column="maternity_bed",
        verbose_name="Cama na maternidade",
        max_length=40,
        blank=True,
        default="",
        help_text="Número/identificação da bed (quando aplicável).",
    )

    total_deliveries = models.PositiveSmallIntegerField(

        db_column="total_deliveries",

        verbose_name="Partos totais",
        default=0,
        help_text="Histórico obstétrico: total de partos já realizados.",
    )
    normal_deliveries = models.PositiveSmallIntegerField(
        db_column="normal_deliveries",
        verbose_name="Partos normais",
        default=0,
        help_text="Histórico obstétrico: total de partos vaginais.",
    )
    cesareans = models.PositiveSmallIntegerField(
        db_column="cesareans",
        verbose_name="Cesarianas",
        default=0,
        help_text="Histórico obstétrico: total de partos por cesariana.",
    )

    status = models.CharField(

        db_column="status",

        verbose_name="Estado",
        max_length=10,
        choices=Status.choices,
        default=Status.FOLLOW_UP,
        db_index=True,
    )

    notes = models.TextField(

        db_column="notes",

        verbose_name="Observações", blank=True, default="")
    created_at = models.DateTimeField(
        verbose_name="Criado em",
        db_column="created_at",
        default=timezone.now,
        db_index=True,
    )

    class Meta:
        db_table = "maternidade_gestacao"
        verbose_name = "Gestação"
        verbose_name_plural = "Gestações"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["tenant", "patient", "created_at"]),
            models.Index(fields=["tenant", "status", "created_at"]),
        ]

    def clean(self):
        super().clean()

        if self.patient_id and self.tenant_id and self.patient.tenant_id != self.tenant_id:
            raise ValidationError({"patient": "Paciente e gestação devem pertencer ao mesmo tenant."})

        if (
            self.responsible_doctor_id
            and self.tenant_id
            and self.responsible_doctor.tenant_id != self.tenant_id
        ):
            raise ValidationError({"responsible_doctor": "Médico e gestação devem pertencer ao mesmo tenant."})

        if self.normal_deliveries > self.total_deliveries:
            raise ValidationError({"normal_deliveries": "Partos normais não pode ser maior que partos totais."})

        if self.cesareans > self.total_deliveries:
            raise ValidationError({"cesareans": "Cesarianas não pode ser maior que partos totais."})

        if (self.normal_deliveries + self.cesareans) > self.total_deliveries:
            raise ValidationError(
                {"total_deliveries": "Partos totais deve ser maior ou igual à soma de partos normais + cesareans."}
            )

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.patient_id:
            self.tenant_id = self.patient.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Gestação {self.pk}"
