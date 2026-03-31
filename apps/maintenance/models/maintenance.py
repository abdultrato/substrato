from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import NoNameCoreModel


class Maintenance(TenantPropagationMixin, NoNameCoreModel):
    """
    Planeamento e execução de manutenção de equipamentos.
    """

    tenant_source = "equipment"  # Propaga tenant do equipamento relacionado
    prefix = "MNT"  # Prefixo para custom_id

    class Type(models.TextChoices):
        DAILY = "DIARIA", "Diária"
        WEEKLY = "SEMANAL", "Semanal"
        MONTHLY = "MENSAL", "Mensal"
        SEMIANNUAL = "SEMESTRAL", "Semestral"
        YEARLY = "ANUAL", "Anual"

    equipment = models.ForeignKey(  # Equipamento alvo da manutenção
        "equipamentos.Equipment",
        db_column="equipment_id",
        on_delete=models.CASCADE,
        related_name="manutencoes",
        db_index=True,
    )

    type = models.CharField(  # Recorrência / categoria
        db_column="type",
        max_length=20,
        choices=Type.choices,
        default=Type.MONTHLY,
        db_index=True,
    )
    scheduled_date = models.DateField(  # Data prevista
        db_column="scheduled_date",
        default=timezone.localdate,
        db_index=True,
    )
    performed_date = models.DateField(  # Data executada (se houver)
        db_column="performed_date",
        null=True,
        blank=True,
        db_index=True,
    )

    description = models.TextField(  # Detalhes da manutenção
        db_column="description",
        blank=True,
        default="",
    )
    technician = models.CharField(  # Técnico responsável
        "Técnico",
        db_column="technician",
        max_length=120,
        blank=True,
        default="",
    )

    class Meta:
        db_table = "manutencoes_manutencao"  # Nome legado
        verbose_name = "Manutenção"
        verbose_name_plural = "Manutenções"
        ordering = ["-scheduled_date", "-created_at"]  # Últimas/agendadas primeiro
        indexes = [
            models.Index(fields=["tenant", "equipment", "scheduled_date"]),
            models.Index(fields=["tenant", "type", "scheduled_date"]),
            models.Index(fields=["tenant", "performed_date"]),
        ]

    def __str__(self) -> str:
        return f"Manutencao {self.equipment} - {self.scheduled_date}"

    @property
    def performed(self) -> bool:
        return bool(self.performed_date)  # Conveniência para UI/serializers

    def clean(self):
        super().clean()

        if self.equipment_id and self.tenant_id and self.equipment.tenant_id != self.tenant_id:
            raise ValidationError({"equipment": "Equipamento e manutenção devem pertencer ao mesmo tenant."})
