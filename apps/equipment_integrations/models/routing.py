from django.db import models

from core.constants.laboratory.sector import Setor
from core.models.base import NoNameCoreModel


class IntegrationRouting(NoNameCoreModel):
    """
    Routing rule that decides which equipment serves a sector so the system can
    create a worklist order automatically when a request is created.
    """

    prefix = "ROUT"

    class ExamType(models.TextChoices):
        LABORATORIO = "LAB", "Exame laboratorial"
        MEDICO = "MED", "Exame médico (imagem/diagnóstico)"

    TipoExame = ExamType

    equipment = models.ForeignKey(

        "integracoes_equipamentos.IntegrationEquipment",

        db_column="equipamento_id",
        on_delete=models.CASCADE,
        related_name="roteamentos",
        db_index=True,
    )

    exam_type = models.CharField(

        db_column="tipo_exame",

        max_length=3,
        choices=ExamType.choices,
        default=ExamType.LABORATORIO,
        db_index=True,
    )

    sector = models.CharField(

        db_column="setor",

        max_length=40,
        choices=Setor.choices,
        db_index=True,
    )

    active = models.BooleanField(

        db_column="ativo",

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
