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

    fonte_inquilino = "equipamento"
    prefixo = "OCR"

    class Type(models.TextChoices):
        AVARIA = "AVARIA", "Avaria"
        INCIDENTE = "INCIDENTE", "Incidente"
        OUTRO = "OUTRO", "Outro"

    Tipo = Type

    equipamento = models.ForeignKey(
        "equipamentos.Equipment",
        on_delete=models.CASCADE,
        related_name="ocorrencias",
        db_index=True,
    )
    data = models.DateTimeField(default=timezone.now, db_index=True)
    tipo = models.CharField(max_length=20, choices=Type.choices, default=Type.AVARIA, db_index=True)
    descricao = models.TextField()
    contacto_assistencia = models.CharField("Contacto de assistência", max_length=120, blank=True, default="")
    resolvido = models.BooleanField(default=False, db_index=True)

    class Meta:
        verbose_name = "Ocorrência"
        verbose_name_plural = "Ocorrências"
        ordering = ["-data", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "equipamento", "data"]),
            models.Index(fields=["inquilino", "tipo", "data"]),
            models.Index(fields=["inquilino", "resolvido"]),
        ]

    def __str__(self) -> str:
        return f"Ocorrencia {self.equipamento} - {self.data:%Y-%m-%d}"

    def clean(self):
        super().clean()

        if self.equipamento_id and self.inquilino_id and self.equipamento.inquilino_id != self.inquilino_id:
            raise ValidationError({"equipamento": "Equipamento e ocorrência devem pertencer ao mesmo inquilino."})
