from django.db import models

from core.constants.laboratory.sector import Setor
from core.models.base import NoNameCoreModel


class IntegrationRouting(NoNameCoreModel):
    """
    Routing rule that decides which equipment serves a sector so the system can
    create a worklist order automatically when a request is created.
    """

    prefixo = "ROUT"

    class ExamType(models.TextChoices):
        LABORATORIO = "LAB", "Exame laboratorial"
        MEDICO = "MED", "Exame médico (imagem/diagnóstico)"

    TipoExame = ExamType

    equipamento = models.ForeignKey(
        "integracoes_equipamentos.IntegrationEquipment",
        on_delete=models.CASCADE,
        related_name="roteamentos",
        db_index=True,
    )

    tipo_exame = models.CharField(
        max_length=3,
        choices=ExamType.choices,
        default=ExamType.LABORATORIO,
        db_index=True,
    )

    setor = models.CharField(
        max_length=40,
        choices=Setor.choices,
        db_index=True,
    )

    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Roteamento (Integração)"
        verbose_name_plural = "Roteamentos (Integração)"
        ordering = ["-criado_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["equipamento", "tipo_exame", "setor"],
                condition=models.Q(deletado=False),
                name="unique_roteamento_por_equipamento_tipo_setor",
            )
        ]

    def __str__(self) -> str:
        return f"{self.equipamento} - {self.tipo_exame} - {self.setor}"
