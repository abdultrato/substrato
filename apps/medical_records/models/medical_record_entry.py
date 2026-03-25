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

    prefix = "PRT"

    class Estado(models.TextChoices):
        RASCUNHO = "RASCUNHO", "Rascunho"
        FINALIZADO = "FINALIZADO", "Finalizado"
        CANCELADO = "CANCELADO", "Cancelado"

    patient = models.ForeignKey(

        "clinico.Patient",

        db_column="paciente_id",
        verbose_name="Paciente",
        on_delete=models.PROTECT,
        related_name="registros_prontuario",
        db_index=True,
    )
    doctor = models.ForeignKey(
        "recursos_humanos.Employee",
        db_column="medico_id",
        verbose_name="Médico",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registros_prontuario",
        db_index=True,
    )

    consultations = models.ManyToManyField(

        "consultas.MedicalConsultation",

        db_table="prontuario_registroprontuario_consultas",
        verbose_name="Consultas",
        blank=True,
        related_name="cardex_registros",
    )

    care_start_at = models.DateTimeField(

        db_column="inicio_atendimento",

        verbose_name="Início do atendimento",
        default=timezone.now,
        db_index=True,
    )
    care_end_at = models.DateTimeField(
        db_column="fim_atendimento",
        verbose_name="Fim do atendimento",
        null=True,
        blank=True,
        db_index=True,
    )
    status = models.CharField(
        db_column="estado",
        verbose_name="Estado",
        max_length=20,
        choices=Estado.choices,
        default=Estado.RASCUNHO,
        db_index=True,
    )

    symptoms = models.TextField(

        db_column="sintomas",

        verbose_name="Sintomas", blank=True, default="")
    diagnosis = models.TextField(
        db_column="diagnostico",
        verbose_name="Diagnóstico", blank=True, default="")
    prescription = models.TextField(
        db_column="prescricao",
        verbose_name="Observações da prescrição",
        blank=True,
        default="",
        help_text="Texto livre opcional. A prescrição estruturada fica nos itens de prescrição.",
    )
    medical_report = models.TextField(
        db_column="relatorio_medico",
        verbose_name="Relatório médico", blank=True, default="")

    class Meta:
        db_table = "prontuario_registroprontuario"
        verbose_name = "Cardex"
        verbose_name_plural = "Cardex"
        ordering = ["-care_start_at", "-created_at"]
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
            self.tenant_id = self.patient.tenant_id
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.custom_id or f"Cardex {self.pk}"
