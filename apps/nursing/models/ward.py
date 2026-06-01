from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import CoreModel, NoNameCoreModel


class Ward(CoreModel):
    """Enfermaria/ala para gestão de camas e internamentos."""

    prefix = "ENF"

    description = models.TextField(

        db_column="description",

        verbose_name="Descrição", blank=True, default="")
    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativa", default=True, db_index=True)

    class Meta:
        db_table = "enfermagem_enfermaria"
        verbose_name = "Enfermaria"
        verbose_name_plural = "Enfermarias"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["tenant", "active", "name"]),
        ]

    def __str__(self) -> str:
        return self.name or (self.custom_id or f"Enfermaria {self.pk}")


class WardBed(NoNameCoreModel):
    """Cama vinculada a uma enfermaria."""

    prefix = "CAMA"

    ward = models.ForeignKey(

        Ward,

        db_column="ward_id",
        verbose_name="Enfermaria",
        on_delete=models.PROTECT,
        related_name="camas",
        db_index=True,
    )

    number = models.CharField(

        db_column="number",

        verbose_name="Número da cama",
        max_length=20,
        db_index=True,
    )

    active = models.BooleanField(

        db_column="active",

        verbose_name="Ativa", default=True, db_index=True)

    class Meta:
        db_table = "enfermagem_camaenfermaria"
        verbose_name = "Cama"
        verbose_name_plural = "Camas"
        ordering = ["ward__name", "number", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "ward", "number"]),
            models.Index(fields=["tenant", "active", "created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "ward", "number"],
                name="uniq_bed_ward_number_por_tenant",
            ),
        ]

    def clean(self):
        super().clean()
        if self.ward_id and self.tenant_id and self.ward.tenant_id != self.tenant_id:
            raise ValidationError({"ward": "Enfermaria e cama devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.ward_id:
            self.tenant_id = self.ward.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Cama {self.number} ({self.ward})"


class WardAdmission(NoNameCoreModel):
    """Internamento/ocupação de uma cama por um paciente (inclui próxima medicação)."""

    prefix = "INT"

    bed = models.ForeignKey(

        WardBed,

        db_column="bed_id",
        verbose_name="Cama",
        on_delete=models.PROTECT,
        related_name="internamentos",
        db_index=True,
    )

    patient = models.ForeignKey(

        "clinical.Patient",

        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="internamentos_ward",
        db_index=True,
    )

    estimated_observation_hours = models.PositiveSmallIntegerField(

        db_column="estimated_observation_hours",

        verbose_name="Tempo estimado de observação (horas)",
        null=True,
        blank=True,
        help_text="Tempo estimado de observação em horas (quando aplicável).",
    )

    admission_date = models.DateTimeField(

        db_column="admission_date",

        verbose_name="Data de internamento",
        default=timezone.now,
        db_index=True,
    )

    expected_discharge_date = models.DateTimeField(

        db_column="expected_discharge_date",

        verbose_name="Data prevista para alta",
        null=True,
        blank=True,
        db_index=True,
    )

    discharged_at = models.DateTimeField(

        db_column="discharged_at",

        verbose_name="Data de alta",
        null=True,
        blank=True,
        db_index=True,
    )

    next_medication_at = models.DateTimeField(

        db_column="next_medication_at",

        verbose_name="Horário da próxima medicação",
        null=True,
        blank=True,
        db_index=True,
    )

    next_medication_description = models.CharField(

        db_column="next_medication_description",

        verbose_name="Descrição da próxima medicação",
        max_length=160,
        blank=True,
        default="",
    )

    active = models.BooleanField(

        db_column="active",

        verbose_name="Internamento ativo",
        default=True,
        db_index=True,
    )

    notes = models.TextField(

        db_column="notes",

        verbose_name="Observações", blank=True, default="")

    class Meta:
        db_table = "enfermagem_internamentoenfermaria"
        verbose_name = "Internamento (Enfermaria)"
        verbose_name_plural = "Internamentos (Enfermaria)"
        ordering = ["-admission_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "active", "admission_date"]),
            models.Index(fields=["tenant", "bed", "active"]),
            models.Index(fields=["tenant", "patient", "admission_date"]),
            models.Index(fields=["tenant", "next_medication_at"]),
        ]

    def clean(self):
        super().clean()

        if self.bed_id and self.tenant_id and self.bed.tenant_id != self.tenant_id:
            raise ValidationError({"bed": "Cama e internamento devem pertencer ao mesmo tenant."})

        if self.patient_id and self.tenant_id and self.patient.tenant_id != self.tenant_id:
            raise ValidationError({"patient": "Paciente e internamento devem pertencer ao mesmo tenant."})

        if self.expected_discharge_date and self.admission_date and self.expected_discharge_date < self.admission_date:
            raise ValidationError(
                {"expected_discharge_date": "Data prevista para alta não pode ser anterior ao internamento."}
            )

        if self.discharged_at and self.admission_date and self.discharged_at < self.admission_date:
            raise ValidationError({"discharged_at": "Data de alta não pode ser anterior ao internamento."})

        # P0.3: CRÍTICO - Validar alta com procedures pendentes
        if self.discharged_at and self.patient_id:
            from apps.nursing.models import Procedure

            pending_procedures = self.patient.procedures_enfermagem.filter(
                deleted=False,
                workflow_status__in=[
                    Procedure.WorkflowStatus.REQUESTED,
                    Procedure.WorkflowStatus.EXECUTED,
                    Procedure.WorkflowStatus.PARTIAL,
                ]
            )

            # OTIMIZAÇÃO P2: Usar count() direto ao invés de exists() + count()
            pending_count = pending_procedures.count()
            if pending_count > 0:
                proc_ids = ", ".join(
                    str(p.custom_id or p.pk) for p in pending_procedures[:5]
                )
                raise ValidationError(
                    {"discharged_at":
                     f"Paciente possui {pending_count} procedimento(s) de enfermagem não concluído(s): {proc_ids}. "
                     f"Conclua ou cancele antes de dar alta."}
                )

        if self.active and self.bed_id:
            qs = self.__class__.all_objects.filter(
                bed_id=self.bed_id,
                active=True,
                deleted=False,
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError({"bed": "Esta cama já possui um internamento ativo."})

    def save(self, *args, **kwargs):
        if not self.tenant_id:
            if self.bed_id:
                self.tenant_id = self.bed.tenant_id
            elif self.patient_id:
                self.tenant_id = self.patient.tenant_id
        if self.discharged_at:
            self.active = False
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = set(update_fields) | {"active"}
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.custom_id or self.pk} - {self.patient} ({self.bed})"
