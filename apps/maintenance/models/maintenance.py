from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.mixins.tenant_propagation import PropagarInquilinoMixin
from core.models.base import NoNameCoreModel


class Maintenance(PropagarInquilinoMixin, NoNameCoreModel):
    """
    Planeamento e execução de manutenção de equipamentos.
    """

    fonte_inquilino = "equipamento"
    prefixo = "MNT"

    class Tipo(models.TextChoices):
        DIARIA = "DIARIA", "Diária"
        SEMANAL = "SEMANAL", "Semanal"
        MENSAL = "MENSAL", "Mensal"
        SEMESTRAL = "SEMESTRAL", "Semestral"
        ANUAL = "ANUAL", "Anual"

    equipamento = models.ForeignKey(
        "equipamentos.Equipment",
        on_delete=models.CASCADE,
        related_name="manutencoes",
        db_index=True,
    )

    tipo = models.CharField(max_length=20, choices=Tipo.choices, default=Tipo.MENSAL, db_index=True)
    data_programada = models.DateField(default=timezone.localdate, db_index=True)
    data_realizada = models.DateField(null=True, blank=True, db_index=True)

    descricao = models.TextField(blank=True, default="")
    tecnico = models.CharField("Técnico", max_length=120, blank=True, default="")

    class Meta:
        verbose_name = "Manutenção"
        verbose_name_plural = "Manutenções"
        ordering = ["-data_programada", "-criado_em"]
        indexes = [
            models.Index(fields=["inquilino", "equipamento", "data_programada"]),
            models.Index(fields=["inquilino", "tipo", "data_programada"]),
            models.Index(fields=["inquilino", "data_realizada"]),
        ]

    def __str__(self) -> str:
        return f"Manutencao {self.equipamento} - {self.data_programada}"

    @property
    def executada(self) -> bool:
        return bool(self.data_realizada)

    def clean(self):
        super().clean()

        if self.equipamento_id and self.inquilino_id:
            if self.equipamento.inquilino_id != self.inquilino_id:
                raise ValidationError({"equipamento": "Equipamento e manutenção devem pertencer ao mesmo inquilino."})
