from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models.base import NoNameCoreModel


class MedicalRecordEntry(NoNameCoreModel):
    """
    Cardex (record de prontuário/anamnese/evolução).

    MVP:
    - symptoms / diagnóstico / prescrição / relatório como campos texto
    - vínculo opcional a uma ou mais consultations

    Futuro:
    - normalizar em entidades (Diagnóstico, Prescrição, etc.)
    - anexos (PDF/imagens)
    """

    prefix = "PRT"  # Prefixo de custom_id

    class Status(models.TextChoices):
        DRAFT = "RASCUNHO", "Rascunho"
        FINALIZED = "FINALIZADO", "Finalizado"
        CANCELED = "CANCELADO", "Cancelado"

    patient = models.ForeignKey(  # Paciente dono do registro
        "clinical.Patient",
        db_column="patient_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="registros_prontuario",
        db_index=True,
    )
    doctor = models.ForeignKey(  # Profissional responsável (opcional)
        "recursos_humanos.Employee",
        db_column="doctor_id",
        verbose_name="Médico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_prontuario",
        db_index=True,
    )

    consultations = models.ManyToManyField(  # Consultas vinculadas
        "consultas.MedicalConsultation",
        db_table="prontuario_registroprontuario_consultas",
        verbose_name="Consultas",
        blank=True,
        related_name="cardex_registros",
    )

    care_start_at = models.DateTimeField(  # Início do atendimento
        db_column="care_start_at",
        verbose_name="Início do atendimento",
        default=timezone.now,
        db_index=True,
    )
    care_end_at = models.DateTimeField(  # Fim do atendimento
        db_column="care_end_at",
        verbose_name="Fim do atendimento",
        null=True,
        blank=True,
        db_index=True,
    )
    status = models.CharField(  # Estado do registro
        db_column="status",
        verbose_name="Estado",
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )

    symptoms = models.TextField(  # Sintomas relatados
        db_column="symptoms",
        verbose_name="Sintomas",
        blank=True,
        default="",
    )
    diagnosis = models.TextField(  # Hipótese diagnóstica
        db_column="diagnosis",
        verbose_name="Diagnóstico",
        blank=True,
        default="",
    )
    prescription = models.TextField(  # Observações livres da prescrição
        db_column="prescription",
        verbose_name="Observações da prescrição",
        blank=True,
        default="",
        help_text="Texto livre opcional. A prescrição estruturada fica nos itens de prescrição.",
    )
    medical_report = models.TextField(  # Relatório médico
        db_column="medical_report",
        verbose_name="Relatório médico",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "prontuario_registroprontuario"  # Nome legado
        verbose_name = "Cardex"
        verbose_name_plural = "Cardex"
        ordering = ["-care_start_at", "-created_at"]  # Atendimentos recentes primeiro
        indexes = [
            models.Index(fields=["tenant", "patient", "care_start_at"]),
            models.Index(fields=["tenant", "doctor", "care_start_at"]),
            models.Index(fields=["tenant", "status", "care_start_at"]),
        ]

    def clean(self):
        super().clean()

        if self.patient_id and self.tenant_id and self.patient.tenant_id != self.tenant_id:
            raise ValidationError({"patient": "Paciente e prontuário devem pertencer ao mesmo tenant."})

        if self.doctor_id and self.tenant_id and self.doctor.tenant_id != self.tenant_id:
            raise ValidationError({"doctor": "Médico e prontuário devem pertencer ao mesmo tenant."})

        if self.care_end_at and self.care_start_at and self.care_end_at < self.care_start_at:
            raise ValidationError({"care_end_at": "Fim do atendimento não pode ser anterior ao início."})

    def save(self, *args, **kwargs):
        if not self.tenant_id and self.patient_id:
            self.tenant_id = self.patient.tenant_id  # Propaga tenant do paciente
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Cardex {self.pk}"
