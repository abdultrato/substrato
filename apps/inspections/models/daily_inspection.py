from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.mixins.tenant_propagation import TenantPropagationMixin
from core.models.base import NoNameCoreModel


class DailyInspection(TenantPropagationMixin, NoNameCoreModel):
    """
    Inspeção diária de operation_status e condições do equipment.
    """

    tenant_source = "equipment"  # Propaga tenant do equipamento
    prefix = "INSP"  # Prefixo de custom_id

    class Funcionamento(models.TextChoices):
        FUNCIONANDO = "FUNCIONANDO", "A funcionar"
        AVARIADO = "AVARIADO", "Avariado"
        DESLIGADO = "DESLIGADO", "Desligado"

    equipment = models.ForeignKey(  # Equipamento inspecionado
        "equipamentos.Equipment",
        db_column="equipment_id",
        on_delete=models.PROTECT,
        related_name="inspecoes_diarias",
        db_index=True,
    )
    date = models.DateField(  # Data da inspeção
        db_column="date",
        default=timezone.localdate,
        db_index=True,
    )
    operation_status = models.CharField(  # Estado de funcionamento
        db_column="operation_status",
        max_length=20,
        choices=Funcionamento.choices,
        default=Funcionamento.FUNCIONANDO,
        db_index=True,
    )
    cleaning_performed = models.BooleanField(  # Higienização realizada?
        db_column="cleaning_performed",
        default=False,
    )
    assessment = models.TextField(  # Avaliação/achados
        db_column="assessment",
        blank=True,
        default="",
    )
    notes = models.TextField(  # Observações adicionais
        db_column="notes",
        blank=True,
        default="",
    )

    class Meta:
        db_table = "inspecoes_inspecaodiaria"  # Nome legado
        verbose_name = "Inspeção Diária"
        verbose_name_plural = "Inspeções Diárias"
        ordering = ["-date", "-created_at"]  # Últimas inspeções primeiro
        indexes = [
            models.Index(fields=["tenant", "equipment", "date"]),
            models.Index(fields=["tenant", "operation_status", "date"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "equipment", "date"],
                name="uq_inspecao_diaria_equipment_date",
            )
        ]  # Evita duplicar inspeção no mesmo dia por equipamento

    def __str__(self) -> str:
        return f"Inspecao {self.equipment} - {self.date}"

    def clean(self):
        super().clean()

        if self.equipment_id and self.tenant_id and self.equipment.tenant_id != self.tenant_id:
            raise ValidationError({"equipment": "Equipamento e inspeção devem pertencer ao mesmo tenant."})
