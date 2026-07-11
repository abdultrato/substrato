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

    prefix = "MAT"  # Prefixo para custom_id

    class Status(models.TextChoices):
        FOLLOW_UP = "ACOMP", "Em acompanhamento"
        DELIVERY = "PARTO", "Parto performed"
        CLOSED = "ENCERR", "Encerrada"
        CANCELED = "CANCEL", "Cancelada"

    patient = models.ForeignKey(  # Paciente gestante
        "clinical.Patient",
        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="gestacoes",
        db_index=True,
    )
    responsible_doctor = models.ForeignKey(  # Médico responsável
        "recursos_humanos.Employee",
        db_column="responsible_doctor_id",
        verbose_name="Médico/Ginecologista responsável",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gestacoes_responsible",
        db_index=True,
    )

    last_menstrual_period_date = models.DateField(  # DUM (base para cálculo de DPP)
        db_column="last_menstrual_period_date",
        verbose_name="Data da última menstruação",
        null=True,
        blank=True,
    )
    expected_delivery_date = models.DateField(  # DPP (estimada)
        db_column="expected_delivery_date",
        verbose_name="Data prevista do parto",
        null=True,
        blank=True,
    )

    nursery = models.ForeignKey(  # Berçário/ala (enfermaria de enfermagem reaproveitada)
        "enfermagem.Ward",
        db_column="nursery_id",
        verbose_name="Berçário",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gestacoes_bercario",
        db_index=True,
        help_text="Enfermaria/berçário vinculado (quando aplicável).",
    )
    maternity_bed = models.ForeignKey(  # Cama na maternidade (cama de enfermagem reaproveitada)
        "enfermagem.WardBed",
        db_column="maternity_bed_id",
        verbose_name="Cama na maternidade",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gestacoes",
        db_index=True,
        help_text="Cama vinculada (quando aplicável).",
    )

    total_deliveries = models.PositiveSmallIntegerField(  # Partos totais (histórico)
        db_column="total_deliveries",
        verbose_name="Partos totais",
        default=0,
        help_text="Histórico obstétrico: total de partos já realizados.",
    )
    normal_deliveries = models.PositiveSmallIntegerField(  # Partos vaginais
        db_column="normal_deliveries",
        verbose_name="Partos normais",
        default=0,
        help_text="Histórico obstétrico: total de partos vaginais.",
    )
    cesareans = models.PositiveSmallIntegerField(  # Partos cesáreos
        db_column="cesareans",
        verbose_name="Cesarianas",
        default=0,
        help_text="Histórico obstétrico: total de partos por cesariana.",
    )

    status = models.CharField(  # Estado atual da gestação
        db_column="status",
        verbose_name="Estado",
        max_length=10,
        choices=Status.choices,
        default=Status.FOLLOW_UP,
        db_index=True,
    )

    notes = models.TextField(  # Observações clínicas
        db_column="notes",
        verbose_name="Observações",
        blank=True,
        default="",
    )
    created_at = models.DateTimeField(  # Timestamp próprio (não usa auto_add)
        verbose_name="Criado em",
        db_column="created_at",
        default=timezone.now,
        db_index=True,
    )

    class Meta:
        db_table = "maternidade_gestacao"  # Nome legado
        verbose_name = "Gestação"
        verbose_name_plural = "Gestações"
        ordering = ["-created_at", "-id"]  # Mais recentes primeiro
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

        if self.nursery_id and self.tenant_id and self.nursery.tenant_id != self.tenant_id:
            raise ValidationError({"nursery": "Berçário e gestação devem pertencer ao mesmo tenant."})

        if self.maternity_bed_id and self.tenant_id and self.maternity_bed.tenant_id != self.tenant_id:
            raise ValidationError({"maternity_bed": "Cama e gestação devem pertencer ao mesmo tenant."})

        if self.maternity_bed_id and self.nursery_id and self.maternity_bed.ward_id != self.nursery_id:
            raise ValidationError(
                {"maternity_bed": "A cama selecionada não pertence ao berçário/enfermaria informado."}
            )

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
            self.tenant_id = self.patient.tenant_id  # Propaga tenant do paciente
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Gestação {self.pk}"

    # ------------------------------------------------------------------ #
    # Ciclo de vida da gestação (§22.40)
    # ------------------------------------------------------------------ #
    def register_delivery(self, *, cesarean: bool = False):
        """Regista o parto (acompanhamento → parto) e atualiza o histórico obstétrico."""
        if self.status != self.Status.FOLLOW_UP:
            raise ValidationError("Apenas gestações em acompanhamento podem registar parto.")
        self.status = self.Status.DELIVERY
        self.total_deliveries += 1
        if cesarean:
            self.cesareans += 1
        else:
            self.normal_deliveries += 1
        self.save()
        return self

    def close(self):
        """Encerra a gestação."""
        if self.status in {self.Status.CLOSED, self.Status.CANCELED}:
            raise ValidationError("Gestação já encerrada/cancelada.")
        self.status = self.Status.CLOSED
        self.save()
        return self

    def cancel(self, *, reason: str = ""):
        """Cancela a gestação (motivo opcional nas observações)."""
        if self.status in {self.Status.CLOSED, self.Status.CANCELED}:
            raise ValidationError("Gestação já encerrada/cancelada.")
        self.status = self.Status.CANCELED
        if reason:
            mark = f"[Cancelamento] {reason}"
            self.notes = f"{self.notes}\n{mark}".strip() if self.notes else mark
        self.save()
        return self
