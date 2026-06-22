"""Motivos e registos de rejeição de amostras na receção do laboratório."""

from django.conf import settings
from django.db import models

from core.models.base import CoreModel, NoNameCoreModel


class SampleRejectionReason(CoreModel):
    """Catálogo de motivos de rejeição de amostra (receção de amostras)."""

    prefix = "MRA"

    class Code(models.TextChoices):
        INSUFFICIENT_VOLUME = "VOLUME_INSUFICIENTE", "Volume insuficiente"
        HEMOLYSIS = "HEMOLISE", "Amostra hemolisada"
        CLOTTED = "COAGULADA", "Amostra coagulada"
        WRONG_TUBE = "TUBO_ERRADO", "Tubo/frasco incorreto"
        UNLABELED = "SEM_IDENTIFICACAO", "Identificação ausente ou incorreta"
        CONTAMINATED = "CONTAMINADA", "Amostra contaminada/derramada"
        DELAYED_TRANSPORT = "TRANSPORTE_TARDIO", "Tempo de transporte excedido"
        IMPROPER_STORAGE = "CONSERVACAO_INADEQUADA", "Conservação/temperatura inadequada"
        OTHER = "OUTRO", "Outro motivo"

    code = models.CharField(
        db_column="code",
        max_length=40,
        choices=Code.choices,
        db_index=True,
        verbose_name="Código do motivo",
    )

    active = models.BooleanField(
        db_column="active",
        default=True,
        db_index=True,
        verbose_name="Ativo",
    )

    class Meta:
        db_table = "clinico_motivo_rejeicao_amostra"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["tenant", "code"], name="uniq_sample_rejection_reason_tenant_code"),
        ]
        verbose_name = "Motivo de rejeição de amostra"
        verbose_name_plural = "Motivos de rejeição de amostra"

    def __str__(self):
        return self.name or self.get_code_display()


class SampleRejectionRecord(NoNameCoreModel):
    """Registo (evento) de rejeição de uma amostra na receção do laboratório.

    Persiste o histórico de forma independente do estado mutável do item — que é
    limpo na recolheita/receção — permitindo distinguir rejeições **pendentes**
    (enviadas à enfermagem, ainda sem resposta/reconferência) de **resolvidas**
    (reconferidas e recebidas pelo laboratório sem nova rejeição).
    """

    prefix = "REJ"

    class Status(models.TextChoices):
        PENDING = "pendente", "Pendente"
        RESOLVED = "resolvida", "Resolvida"

    request = models.ForeignKey(
        "clinical.LabRequest",
        on_delete=models.CASCADE,
        related_name="sample_rejections",
        verbose_name="Requisição",
    )
    request_item = models.ForeignKey(
        "clinical.LabRequestItem",
        on_delete=models.CASCADE,
        related_name="rejections",
        verbose_name="Item da requisição",
    )
    reasons_text = models.CharField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Motivos",
    )
    note = models.TextField(blank=True, default="", verbose_name="Observação")
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="Estado",
    )
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="Resolvida em")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="+",
        verbose_name="Resolvida por",
    )

    class Meta:
        db_table = "clinico_rejeicao_amostra"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["request"]),
        ]
        verbose_name = "Rejeição de amostra"
        verbose_name_plural = "Rejeições de amostra"

    def __str__(self):
        return f"Rejeição #{self.pk} ({self.get_status_display()})"
