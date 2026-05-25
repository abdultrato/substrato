from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.incidents.models.incident import sync_equipment_maintenance_flag
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

    class MaintenanceType(models.TextChoices):
        PREVENTIVE = "PREVENTIVA", "Preventiva"
        CORRECTIVE = "CORRECTIVA", "Correctiva"

    incident = models.ForeignKey(
        "ocorrencias.Incident",
        db_column="incident_id",
        on_delete=models.SET_NULL,
        related_name="maintenances",
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Ocorrência de origem",
        help_text="Ocorrência que deu origem a esta manutenção.",
    )
    equipment = models.ForeignKey(  # Equipamento alvo da manutenção
        "equipamentos.Equipment",
        db_column="equipment_id",
        on_delete=models.PROTECT,
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
    maintenance_type = models.CharField(
        "Tipo de manutenção",
        db_column="maintenance_type",
        max_length=20,
        choices=MaintenanceType.choices,
        default=MaintenanceType.PREVENTIVE,
        db_index=True,
        help_text="Indica se a manutenção é preventiva ou correctiva.",
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
            models.Index(fields=["tenant", "incident"]),
            models.Index(fields=["tenant", "equipment", "scheduled_date"]),
            models.Index(fields=["tenant", "type", "scheduled_date"]),
            models.Index(fields=["tenant", "maintenance_type", "scheduled_date"]),
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

        if self.incident_id and self.equipment_id and self.incident.equipment_id != self.equipment_id:
            raise ValidationError({"incident": "A ocorrência deve pertencer ao equipamento da manutenção."})

        if self.incident_id and self.tenant_id and self.incident.tenant_id != self.tenant_id:
            raise ValidationError({"incident": "Ocorrência e manutenção devem pertencer ao mesmo tenant."})

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        if self.incident_id and not self.equipment_id:
            self.equipment = self.incident.equipment
            if update_fields is not None:
                kwargs["update_fields"] = list({*update_fields, "equipment"})

        self.full_clean()
        super().save(*args, **kwargs)

        if not self.incident_id:
            return

        incident = self.incident
        update_fields = []

        if self.performed_date:
            if not incident.resolved:
                incident.resolved = True
                update_fields.append("resolved")
            if incident.requires_maintenance:
                incident.requires_maintenance = False
                update_fields.append("requires_maintenance")
            if not incident.maintenance_completed_at:
                incident.maintenance_completed_at = timezone.now()
                update_fields.append("maintenance_completed_at")

        if update_fields:
            incident.save(update_fields=update_fields)
        elif incident.equipment_id:
            sync_equipment_maintenance_flag(incident.equipment_id)
