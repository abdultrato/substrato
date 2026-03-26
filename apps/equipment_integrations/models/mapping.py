from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import CoreModel


class IntegrationAnalyteMapping(CoreModel):
    """
    Mapeia código do equipment (ex.: "HB", "WBC") para um ExameCampo do system.
    Isso permite que um analisador preencha ResultadoItem automaticamente.
    """

    prefix = "MAP"

    equipment = models.ForeignKey(
        "integracoes_equipamentos.IntegrationEquipment",
        verbose_name="Equipamento",
        db_column="equipment_id",
        on_delete=models.CASCADE,
        related_name="mapeamentos_analitos",
        db_index=True,
    )

    code = models.CharField(
        db_column="code",
        verbose_name="Código",
        max_length=80, db_index=True)

    exam_field = models.ForeignKey(
        "clinical.LabExamField",
        verbose_name="Campo de exame",
        db_column="exam_field_id",
        on_delete=models.PROTECT,
        related_name="mapeamentos_integracao",
        db_index=True,
    )

    unit_override = models.CharField(
        db_column="unit_override",
        verbose_name="Unidade (override)",
        max_length=30, blank=True, default="")

    active = models.BooleanField(
        db_column="active",
        verbose_name="Ativo",
        default=True, db_index=True)

    class Meta:
        db_table = "integracoes_equipamentos_integracaomapeamentoanalito"
        verbose_name = "Mapeamento de analito"
        verbose_name_plural = "Mapeamentos de analitos"
        ordering = ["equipment", "code"]
        constraints = [
            models.UniqueConstraint(
                fields=["equipment", "code"],
                condition=models.Q(deleted=False),
                name="unique_code_por_equipment",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "equipment", "active"]),
        ]

    def clean(self):
        super().clean()
        if (
            self.equipment_id
            and self.exam_field_id
            and self.equipment.tenant_id != self.exam_field.tenant_id
        ):
            raise ValidationError("Equipamento e ExameCampo devem pertencer ao mesmo tenant.")

    def __str__(self) -> str:
        return f"{self.equipment} :: {self.code} -> {self.exam_field}"
