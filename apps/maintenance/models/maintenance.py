from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel


class Maintenance(PropagarInquilinoMixin, NoNameCoreModel):
    """
    Planeamento e execução de manutenção de equipamentos.
    """

    fonte_tenant = "equipment"
    prefix = "MNT"

    class Type(models.TextChoices):
        DIARIA = "DIARIA", "Diária"
        SEMANAL = "SEMANAL", "Semanal"
        MENSAL = "MENSAL", "Mensal"
        SEMESTRAL = "SEMESTRAL", "Semestral"
        ANUAL = "ANUAL", "Anual"

    Tipo = Type

    equipment = models.ForeignKey(

        "equipamentos.Equipment",

        db_column="equipamento_id",
        on_delete=models.CASCADE,
        related_name="manutencoes",
        db_index=True,
    )

    type = models.CharField(

        db_column="tipo",

        max_length=20, choices=Type.choices, default=Type.MENSAL, db_index=True)
    scheduled_date = models.DateField(
        db_column="data_programada",
        default=timezone.localdate, db_index=True)
    performed_date = models.DateField(
        db_column="data_realizada",
        null=True, blank=True, db_index=True)

    description = models.TextField(

        db_column="descricao",

        blank=True, default="")
    technician = models.CharField("Técnico", 
        db_column="tecnico",
         max_length=120, blank=True, default="")

    class Meta:
        db_table = "manutencoes_manutencao"
        verbose_name = "Manutenção"
        verbose_name_plural = "Manutenções"
        ordering = ["-scheduled_date", "-created_at"]
        indexes = [
            models.Index(fields=["tenant", "equipment", "scheduled_date"]),
            models.Index(fields=["tenant", "type", "scheduled_date"]),
            models.Index(fields=["tenant", "performed_date"]),
        ]

    def __str__(self) -> str:
        return f"Manutencao {self.equipment} - {self.scheduled_date}"

    @property
    def executada(self) -> bool:
        return bool(self.performed_date)

    def clean(self):
        super().clean()

        if self.equipment_id and self.tenant_id and self.equipment.tenant_id != self.tenant_id:
            raise ValidationError({"equipment": "Equipamento e manutenção devem pertencer ao mesmo tenant."})
