from django.db import models

from nucleo.constantes.laboratorio.setor import Setor
from nucleo.modelos.base import NoNameCoreModel


class IntegracaoRoteamento(NoNameCoreModel):
    """
    Regra de roteamento: define qual equipamento atende um "setor" (ex.: Hematologia,
    Bioquímica) para que, ao criar uma requisição, o sistema crie uma ordem na worklist
    do equipamento (via integrações).
    """

    prefixo = "ROUT"

    class TipoExame(models.TextChoices):
        LABORATORIO = "LAB", "Exame laboratorial"
        MEDICO = "MED", "Exame médico (imagem/diagnóstico)"

    equipamento = models.ForeignKey(
        "integracoes_equipamentos.IntegracaoEquipamento",
        on_delete=models.CASCADE,
        related_name="roteamentos",
        db_index=True,
    )

    tipo_exame = models.CharField(
        max_length=3,
        choices=TipoExame.choices,
        default=TipoExame.LABORATORIO,
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

