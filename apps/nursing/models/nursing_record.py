from django.core.exceptions import ValidationError
from django.db import models

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import CoreModel
from .ward import WardScopedModel


class NursingRecord(TenantPropagationMixin, WardScopedModel, CoreModel):
    """Registro de procedimentos/observações realizados pela enfermagem."""

    tenant_source = "patient"  # Propaga tenant do paciente
    prefix = "REG"  # Prefixo para custom_id

    class Prioridade(models.TextChoices):
        URGENTE = "URG", "Urgente"
        NORMAL = "NOR", "Normal"
        BAIXA = "BAI", "Baixa"

    class RecordKind(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        LAB_COLLECTION_REQUEST = "LAB_COLLECTION_REQUEST", "Requisição laboratorial para coleta"

    patient = models.ForeignKey(  # Paciente alvo do registro
        "clinical.Patient",
        verbose_name="Paciente",
        db_column="patient_id",
        on_delete=models.PROTECT,
        related_name="registros_enfermagem",
    )

    lab_request = models.OneToOneField(
        "clinical.LabRequest",
        verbose_name="Requisição laboratorial",
        db_column="lab_request_id",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="nursing_intake_record",
    )

    record_kind = models.CharField(
        db_column="record_kind",
        verbose_name="Tipo de registro",
        max_length=40,
        choices=RecordKind.choices,
        default=RecordKind.MANUAL,
        db_index=True,
    )

    origin_role = models.CharField(
        db_column="origin_role",
        verbose_name="Perfil de origem",
        max_length=60,
        blank=True,
        default="",
    )

    priority = models.CharField(  # Prioridade clínica
        db_column="priority",
        verbose_name="Prioridade",
        max_length=3,
        choices=Prioridade.choices,
        default=Prioridade.NORMAL,
        db_index=True,
    )

    observation = models.TextField(  # Texto livre
        db_column="observation",
        verbose_name="Observação",
        blank=True,
        default="",
    )

    collection_guidance = models.JSONField(
        db_column="collection_guidance",
        verbose_name="Guia de coleta",
        default=list,
        blank=True,
        help_text=(
            "Estrutura operacional da coleta por exame, com opções de amostra, "
            "tipo de frasco/tubo e volume mínimo."
        ),
    )

    record_date = models.DateTimeField(  # Data/hora do registro
        db_column="record_date",
        auto_now_add=True,
        verbose_name="Data do registo",
    )

    class Meta:
        db_table = "enfermagem_registroenfermagem"  # Nome legado
        verbose_name = "Registro de Enfermagem"
        verbose_name_plural = "Registros de Enfermagem"
        ordering = ["-record_date"]  # Mais recentes primeiro
        indexes = [
            models.Index(fields=["record_kind", "record_date"]),
            models.Index(fields=["lab_request", "deleted"]),
        ]

    def clean(self):
        super().clean()

        if self.lab_request_id and self.tenant_id and self.lab_request.tenant_id != self.tenant_id:
            raise ValidationError({"lab_request": "Requisição e registro de enfermagem devem pertencer ao mesmo tenant."})

        if self.lab_request_id and self.patient_id and self.lab_request.patient_id != self.patient_id:
            raise ValidationError({"lab_request": "Requisição deve pertencer ao mesmo paciente do registro."})

    def __str__(self):
        return f"Registro - {self.patient}"
