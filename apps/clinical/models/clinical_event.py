from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from core.constants.tipo_evento_clinico import TipoEventoClinico
from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import CoreModel

from .patient import Patient
from .lab_request import LabRequest
from .result_item import ResultItem


class ClinicalEvent(PropagarInquilinoMixin, CoreModel):
    """
    Registro imutável de eventos clínicos.

    Utilizado para:
    • auditoria clínica
    • histórico médico
    • rastreabilidade laboratorial
    """

    fonte_inquilino = "paciente"
    prefixo = "EVT"

    paciente = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name="eventos_clinicos",
    )

    requisicao = models.ForeignKey(
        LabRequest,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="eventos_clinicos",
    )

    resultado = models.ForeignKey(
        ResultItem,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="eventos_clinicos",
    )

    tipo_evento = models.CharField(
        max_length=50,
        choices=TipoEventoClinico.choices,
        db_index=True,
    )

    descricao = models.TextField()

    class Meta:
        ordering = ["-criado_em"]

        indexes = [
            models.Index(fields=["paciente"]),
            models.Index(fields=["tipo_evento"]),
            models.Index(fields=["criado_em"]),
            models.Index(fields=["requisicao"]),
            models.Index(fields=["resultado"]),
        ]

        constraints = [  # evento deve ter pelo menos requisicao ou resultado
            models.CheckConstraint(
                check=(Q(requisicao__isnull=False) | Q(resultado__isnull=False)),
                name="evento_clinico_deve_ter_contexto",
            )
        ]

    # =====================================================
    # VALIDAÇÃO DE DOMÍNIO
    # =====================================================

    def clean(self):
        # resultado deve pertencer à requisição
        if self.resultado and self.requisicao and self.resultado.requisicao_id != self.requisicao_id:
            raise ValidationError("Resultado não pertence à requisição informada.")

        # paciente deve ser consistente
        if self.requisicao and self.requisicao.paciente_id != self.paciente_id:
            raise ValidationError("Paciente inconsistente com a requisição.")

        if self.resultado and self.resultado.requisicao.paciente_id != self.paciente_id:
            raise ValidationError("Paciente inconsistente com o resultado.")

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
        return f"{self.tipo_evento} - {self.paciente.nome}"
