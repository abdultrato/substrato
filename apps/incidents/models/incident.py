from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import NoNameCoreModel


class Incident(TenantPropagationMixin, NoNameCoreModel):
    """
    Registro de avarias e incidentes.
    """

    tenant_source = "equipment"  # Propaga tenant do equipamento relacionado
    prefix = "OCR"  # Prefixo para custom_id

    class Type(models.TextChoices):
        BREAKDOWN = "AVARIA", "Avaria"
        INCIDENT = "INCIDENTE", "Incidente"
        OTHER = "OUTRO", "Outro"

    equipment = models.ForeignKey(  # Equipamento ao qual o incidente pertence
        "equipamentos.Equipment",
        db_column="equipment_id",
        on_delete=models.CASCADE,
        related_name="ocorrencias",
        db_index=True,
    )
    date = models.DateTimeField(  # Data/hora do incidente
        db_column="date",
        default=timezone.now,
        db_index=True,
    )
    type = models.CharField(  # Tipo do incidente
        db_column="type",
        max_length=20,
        choices=Type.choices,
        default=Type.BREAKDOWN,
        db_index=True,
    )
    description = models.TextField(  # Detalhe do ocorrido
        db_column="description",
    )
    support_contact = models.CharField(  # Contato do suporte/manutenção
        "Contacto de assistência",
        db_column="support_contact",
        max_length=120,
        blank=True,
        default="",
    )
    resolved = models.BooleanField(  # Status de resolução
        db_column="resolved",
        default=False,
        db_index=True,
    )

    class Meta:
        db_table = "ocorrencias_ocorrencia"  # Nome legado
        verbose_name = "Ocorrência"
        verbose_name_plural = "Ocorrências"
        ordering = ["-date", "-created_at"]  # Mais recentes primeiro
        indexes = [
            models.Index(fields=["tenant", "equipment", "date"]),
            models.Index(fields=["tenant", "type", "date"]),
            models.Index(fields=["tenant", "resolved"]),
        ]

    def __str__(self) -> str:
        return f"Ocorrencia {self.equipment} - {self.date:%Y-%m-%d}"

    def clean(self):
        super().clean()

        if self.equipment_id and self.tenant_id and self.equipment.tenant_id != self.tenant_id:
            raise ValidationError({"equipment": "Equipamento e ocorrência devem pertencer ao mesmo tenant."})
