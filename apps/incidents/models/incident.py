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
        on_delete=models.PROTECT,
        related_name="ocorrencias",
        null=True,
        blank=True,
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
    post_incident_actions = models.TextField(
        "Ações após ocorrência",
        db_column="post_incident_actions",
        blank=True,
        default="",
    )
    requires_maintenance = models.BooleanField(
        "Requer manutenção",
        db_column="requires_maintenance",
        default=False,
        db_index=True,
    )
    maintenance_requested_at = models.DateTimeField(
        "Pedido de manutenção em",
        db_column="maintenance_requested_at",
        null=True,
        blank=True,
        db_index=True,
    )
    maintenance_completed_at = models.DateTimeField(
        "Manutenção concluída em",
        db_column="maintenance_completed_at",
        null=True,
        blank=True,
        db_index=True,
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
            models.Index(fields=["tenant", "requires_maintenance"]),
        ]

    def __str__(self) -> str:
        return f"Ocorrencia {self.equipment} - {self.date:%Y-%m-%d}"

    def clean(self):
        super().clean()

        if self.equipment_id and self.tenant_id and self.equipment.tenant_id != self.tenant_id:
            raise ValidationError({"equipment": "Equipamento e ocorrência devem pertencer ao mesmo tenant."})
        if self.requires_maintenance and not self.equipment_id:
            raise ValidationError(
                {"equipment": "Informe o equipamento quando a ocorrência requer manutenção."}
            )

    @property
    def maintenance_status(self) -> str:
        latest = self.maintenances.order_by("-performed_date", "-scheduled_date", "-created_at").first()
        if latest and latest.performed_date:
            return "Manutenção concluída"
        if latest:
            return "Manutenção agendada"
        if self.requires_maintenance and not self.resolved:
            return "Manutenção pendente"
        return "Sem manutenção pendente"

    def save(self, *args, **kwargs):
        previous_equipment_id = None
        if self.pk:
            previous_equipment_id = (
                type(self).all_objects.filter(pk=self.pk)
                .values_list("equipment_id", flat=True)
                .first()
            )

        update_fields = kwargs.get("update_fields")
        if update_fields is not None:
            update_fields = set(update_fields)

        if not self.equipment_id and not self.requires_maintenance:
            self.requires_maintenance = False
            if update_fields is not None:
                update_fields.add("requires_maintenance")
        elif self.equipment_id and not self.resolved:
            self.requires_maintenance = True
            if update_fields is not None:
                update_fields.add("requires_maintenance")
            if not self.maintenance_requested_at:
                self.maintenance_requested_at = timezone.now()
                if update_fields is not None:
                    update_fields.add("maintenance_requested_at")
        elif self.resolved:
            self.requires_maintenance = False
            if update_fields is not None:
                update_fields.add("requires_maintenance")

        if update_fields is not None:
            kwargs["update_fields"] = list(update_fields)

        self.full_clean()
        super().save(*args, **kwargs)

        equipment_ids = {self.equipment_id, previous_equipment_id}
        for equipment_id in {item for item in equipment_ids if item}:
            sync_equipment_maintenance_flag(equipment_id)


def sync_equipment_maintenance_flag(equipment_id: int) -> None:
    from apps.equipment.models.equipment import Equipment

    first_pending = (
        Incident.objects.filter(
            equipment_id=equipment_id,
            requires_maintenance=True,
            resolved=False,
            deleted=False,
        )
        .order_by("maintenance_requested_at", "date", "created_at")
        .first()
    )

    Equipment.objects.filter(pk=equipment_id).update(
        requires_maintenance=first_pending is not None,
        maintenance_required_since=(
            first_pending.maintenance_requested_at if first_pending is not None else None
        ),
    )
