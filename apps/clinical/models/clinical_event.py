from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.constants.clinical_event_type import TipoEventoClinico
from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import CoreModel

from .lab_request import LabRequest
from .patient import Patient
from .result_item import ResultItem


class ClinicalEvent(PropagarInquilinoMixin, CoreModel):
    """
    Registro imutável de eventos clínicos.

    Utilizado para:
    • auditoria clínica
    • histórico médico
    • rastreabilidade laboratorial
    """

    fonte_tenant = "patient"
    prefix = "EVT"

    patient = models.ForeignKey(

        Patient,

        db_column="paciente_id",
        on_delete=models.CASCADE,
        related_name="eventos_clinicos",
    )

    request = models.ForeignKey(

        LabRequest,

        db_column="requisicao_id",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="eventos_clinicos",
    )

    result = models.ForeignKey(

        ResultItem,

        db_column="resultado_id",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="eventos_clinicos",
    )

    event_type = models.CharField(

        db_column="tipo_evento",

        max_length=50,
        choices=TipoEventoClinico.choices,
        db_index=True,
    )

    description = models.TextField(

        db_column="descricao",

        )

    class Meta:
        db_table = "clinico_eventoclinico"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["patient"]),
            models.Index(fields=["event_type"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["request"]),
            models.Index(fields=["result"]),
        ]

        constraints = [  # evento deve ter pelo menos request ou result
            models.CheckConstraint(
                check=(Q(request__isnull=False) | Q(result__isnull=False)),
                name="evento_clinico_deve_ter_contexto",
            )
        ]

    # =====================================================
    # VALIDAÇÃO DE DOMÍNIO
    # =====================================================

    def clean(self):
        # result deve pertencer à requisição
        if self.result and self.request and self.result.request_id != self.request_id:
            raise ValidationError("Resultado não pertence à requisição informada.")

        # patient deve ser consistente
        if self.request and self.request.patient_id != self.patient_id:
            raise ValidationError("Paciente inconsistente com a requisição.")

        if self.result and self.result.request.patient_id != self.patient_id:
            raise ValidationError("Paciente inconsistente com o result.")

    # =====================================================
    # EVENTO É IMUTÁVEL
    # =====================================================

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Evento clínico é imutável.")

        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Evento clínico não pode ser removido.")

    # =====================================================

    def __str__(self):
        return f"{self.event_type} - {self.patient.name}"
