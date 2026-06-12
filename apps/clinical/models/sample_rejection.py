"""Motivos de rejeição de amostras na receção do laboratório."""

from django.db import models

from core.models.base import CoreModel


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
