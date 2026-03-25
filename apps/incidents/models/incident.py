from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel


class Incident(PropagarInquilinoMixin, NoNameCoreModel):
    """
    Registro de avarias e incidentes.
    """

    fonte_tenant = "equipment"
    prefix = "OCR"

    class Type(models.TextChoices):
        AVARIA = "AVARIA", "Avaria"
        INCIDENTE = "INCIDENTE", "Incidente"
        OUTRO = "OUTRO", "Outro"

    Tipo = Type

    equipment = models.ForeignKey(

        "equipamentos.Equipment",

        db_column="equipamento_id",
        on_delete=models.CASCADE,
        related_name="ocorrencias",
        db_index=True,
    )
    date = models.DateTimeField(
        db_column="data",
        default=timezone.now, db_index=True)
    type = models.CharField(
        db_column="tipo",
        max_length=20, choices=Type.choices, default=Type.AVARIA, db_index=True)
    description = models.TextField(
        db_column="descricao",
        )
    support_contact = models.CharField("Contacto de assistência", 
        db_column="contacto_assistencia",
         max_length=120, blank=True, default="")
    resolved = models.BooleanField(
        db_column="resolvido",
        default=False, db_index=True)

    class Meta:
        db_table = "ocorrencias_ocorrencia"
        verbose_name = "Ocorrência"
        verbose_name_plural = "Ocorrências"
        ordering = ["-date", "-created_at"]
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
