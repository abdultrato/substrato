from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class RequestingSector(models.TextChoices):
    LABORATORIO = "LAB", "Laboratório"
    ENFERMAGEM = "ENF", "Enfermagem"
    RECEPCAO = "REC", "Recepção"


class MaterialRequisitionStatus(models.TextChoices):
    PENDING = "PEN", "Pendente"
    PARTIAL = "PAR", "Parcialmente aviada"
    FULFILLED = "FUL", "Aviada"
    ON_HOLD = "HLD", "Arquivada (aguarda estoque)"


class MaterialRequisition(NoNameCoreModel):
    """
    Requisição interna de materiais (multi-setor) para a farmácia.

    - Criada por Laboratório / Enfermagem / Recepção
    - Aviada (total/parcial) pela Farmácia
    - Pode ser arquivada quando não é possível atender no momento
    """

    prefix = "REQFAR"

    sector = models.CharField(
        db_column="sector",
        verbose_name="Setor solicitante",
        max_length=3,
        choices=RequestingSector.choices,
        db_index=True,
    )

    requested_by_department = models.CharField(
        db_column="requested_by_department",
        verbose_name="Departamento (snapshot)",
        max_length=120,
        blank=True,
        default="",
        help_text="Departamento do utilizador no momento da requisição.",
    )

    status = models.CharField(
        db_column="status",
        verbose_name="Estado",
        max_length=3,
        choices=MaterialRequisitionStatus.choices,
        default=MaterialRequisitionStatus.PENDING,
        db_index=True,
    )

    hold_reason = models.TextField(
        db_column="hold_reason",
        verbose_name="Motivo do arquivamento",
        null=True,
        blank=True,
        default=None,
    )

    fulfilled_at = models.DateTimeField(
        db_column="fulfilled_at",
        verbose_name="Aviada em",
        null=True,
        blank=True,
        default=None,
        db_index=True,
    )
    fulfilled_by = models.ForeignKey(
        "identidade.User",
        db_column="fulfilled_by_id",
        verbose_name="Aviada por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="materialrequisicao_aviada",
        db_index=True,
    )

    on_hold_at = models.DateTimeField(
        db_column="on_hold_at",
        verbose_name="Arquivada em",
        null=True,
        blank=True,
        default=None,
        db_index=True,
    )
    on_hold_by = models.ForeignKey(
        "identidade.User",
        db_column="on_hold_by_id",
        verbose_name="Arquivada por",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="materialrequisicao_arquivada",
        db_index=True,
    )

    class Meta:
        db_table = "farmacia_requisicaomaterial"
        verbose_name = "Requisição de material"
        verbose_name_plural = "Requisições de material"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status", "created_at"]),
            models.Index(fields=["tenant", "sector", "created_at"]),
        ]

    def clean(self):
        super().clean()

        # Consistência estado vs campos de auditoria do workflow.
        if self.status == MaterialRequisitionStatus.ON_HOLD and not self.on_hold_at:
            raise ValidationError("Requisições arquivadas devem ter data de arquivamento.")

        if self.status == MaterialRequisitionStatus.FULFILLED and not self.fulfilled_at:
            raise ValidationError("Requisições aviadas devem ter data de avio.")

