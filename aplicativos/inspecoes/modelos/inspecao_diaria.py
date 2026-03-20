from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from nucleo.mixins.tenant_propagation import PropagarInquilinoMixin
from nucleo.modelos.base import NoNameCoreModel


class InspecaoDiaria(PropagarInquilinoMixin, NoNameCoreModel):
    """
    Inspeção diária de funcionamento e condições do equipamento.
    """

    fonte_inquilino = "equipamento"
    prefixo = "INSP"

    class Funcionamento(models.TextChoices):
        FUNCIONANDO = "FUNCIONANDO", "A funcionar"
        AVARIADO = "AVARIADO", "Avariado"
        DESLIGADO = "DESLIGADO", "Desligado"

    equipamento = models.ForeignKey(
        "equipamentos.Equipamento",
        on_delete=models.CASCADE,
        related_name="inspecoes_diarias",
        db_index=True,
    )
    data = models.DateField(default=timezone.localdate, db_index=True)
    funcionamento = models.CharField(
        max_length=20,
        choices=Funcionamento.choices,
        default=Funcionamento.FUNCIONANDO,
        db_index=True,
    )
    limpeza_realizada = models.BooleanField(default=False)
    avaliacao = models.TextField(blank=True, default="")
    observacoes = models.TextField(blank=True, default="")

    class Meta:
        verbose_name = "Inspeção Diária"
        verbose_name_plural = "Inspeções Diárias"
        ordering = ["-data", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "equipamento", "data"]),
            models.Index(fields=["inquilino", "funcionamento", "data"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["inquilino", "equipamento", "data"],
                name="uq_inspecao_diaria_equipamento_data",
            )
        ]

    def __str__(self) -> str:
        return f"Inspecao {self.equipamento} - {self.data}"

    def clean(self):
        super().clean()

        if self.equipamento_id and self.inquilino_id:
            if self.equipamento.inquilino_id != self.inquilino_id:
                raise ValidationError({"equipamento": "Equipamento e inspeção devem pertencer ao mesmo inquilino."})
