"""Regras de roteamento para direcionar pedidos a equipamentos por setor."""

from django.db import models

from core.constants.laboratory.sector import Sector
from core.constants.medical_exam.medical_exam_sector import MedicalExamSector
from core.models.base import NoNameCoreModel


def _sector_choices():
    seen = set()
    choices = []
    for value, label in [*Sector.choices, *MedicalExamSector.choices]:
        if value in seen:
            continue
        seen.add(value)
        choices.append((value, label))
    return choices


SECTOR_CHOICES = _sector_choices()


class IntegrationRouting(NoNameCoreModel):
    """
    Routing rule that decides which equipment serves a sector so the system can
    create a worklist order automatically when a request is created.
    """

    prefix = "ROUT"  # Prefixo para IDs amigáveis

    class ExamType(models.TextChoices):
        LABORATORIO = "LAB", "Exame laboratorial"
        MEDICO = "MED", "Exame médico (imagem/diagnóstico)"
        RADIOLOGIA = "RAD", "Radiologia / Imagiologia"
        DIAGNOSTICO_ESPECIALIZADO = "SDX", "Diagnóstico especializado"
        CARDIOLOGIA = "CAR", "Cardiologia"
        NEUROLOGIA = "NEU", "Neurologia"
        OFTALMOLOGIA = "OFT", "Oftalmologia"

    TipoExame = ExamType

    equipment = models.ForeignKey(

        "integracoes_equipamentos.IntegrationEquipment",

        db_column="equipment_id",
        on_delete=models.CASCADE,
        related_name="roteamentos",
        db_index=True,
    )

    exam_type = models.CharField(

        db_column="exam_type",

        max_length=3,
        choices=ExamType.choices,
        default=ExamType.LABORATORIO,
        db_index=True,
    )

    sector = models.CharField(

        db_column="sector",

        max_length=40,
        choices=SECTOR_CHOICES,
        db_index=True,
    )

    active = models.BooleanField(

        db_column="active",

        default=True, db_index=True)

    class Meta:
        db_table = "integracoes_equipamentos_integracaoroteamento"
        verbose_name = "Roteamento (Integração)"
        verbose_name_plural = "Roteamentos (Integração)"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["equipment", "exam_type", "sector"],
                condition=models.Q(deleted=False),
                name="unique_roteamento_por_equipment_type_sector",
            )
        ]

    def __str__(self) -> str:
        return f"{self.equipment} - {self.exam_type} - {self.sector}"
