from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import CoreModel


class IntegrationAnalyteMapping(CoreModel):
    """
    Mapeia código do equipamento (ex.: "HB", "WBC") para um ExameCampo do system.
    Isso permite que um analisador preencha ResultadoItem automaticamente.
    """

    prefixo = "MAP"

    equipamento = models.ForeignKey(
        "integracoes_equipamentos.IntegrationEquipment",
        on_delete=models.CASCADE,
        related_name="mapeamentos_analitos",
        db_index=True,
    )

    codigo = models.CharField(max_length=80, db_index=True)

    exame_campo = models.ForeignKey(
        "clinico.LabExamField",
        on_delete=models.PROTECT,
        related_name="mapeamentos_integracao",
        db_index=True,
    )

    unidade_override = models.CharField(max_length=30, blank=True, default="")

    ativo = models.BooleanField(default=True, db_index=True)

    class Meta:
        verbose_name = "Mapeamento de analito"
        verbose_name_plural = "Mapeamentos de analitos"
        ordering = ["equipamento", "codigo"]
        constraints = [
            models.UniqueConstraint(
                fields=["equipamento", "codigo"],
                condition=models.Q(deletado=False),
                name="unique_codigo_por_equipamento",
            )
        ]
        indexes = [
            models.Index(fields=["inquilino", "equipamento", "ativo"]),
        ]

    def clean(self):
        super().clean()
        if (
            self.equipamento_id
            and self.exame_campo_id
            and self.equipamento.inquilino_id != self.exame_campo.inquilino_id
        ):
            raise ValidationError("Equipamento e ExameCampo devem pertencer ao mesmo inquilino.")

    def __str__(self) -> str:
        return f"{self.equipamento} :: {self.codigo} -> {self.exame_campo}"
