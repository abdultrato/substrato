from __future__ import annotations

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.models.base import NoNameCoreModel


class MaterialRequisitionItem(NoNameCoreModel):
    prefix = "REQITM"

    requisition = models.ForeignKey(
        "farmacia.MaterialRequisition",
        db_column="requisition_id",
        verbose_name="Requisição",
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
    )

    lot = models.ForeignKey(
        "farmacia.Lot",
        db_column="lot_id",
        verbose_name="Lote",
        on_delete=models.PROTECT,
        related_name="material_request_items",
        db_index=True,
    )

    requested_quantity = models.PositiveIntegerField(
        db_column="requested_quantity",
        verbose_name="Quantidade solicitada",
        validators=[MinValueValidator(1)],
    )

    supplied_quantity = models.PositiveIntegerField(
        db_column="supplied_quantity",
        verbose_name="Quantidade aviada",
        default=0,
    )

    notes = models.TextField(
        db_column="notes",
        verbose_name="Observações",
        null=True,
        blank=True,
        default=None,
    )

    class Meta:
        db_table = "farmacia_requisicaomaterialitem"
        verbose_name = "Item da requisição de material"
        verbose_name_plural = "Itens de requisição de material"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["tenant", "requisition"]),
            models.Index(fields=["tenant", "lot"]),
        ]

    @property
    def available_quantity(self) -> int:
        try:
            return int(self.lot.balance())
        except Exception:
            return 0

    def clean(self):
        super().clean()

        if self.requisition_id and self.tenant_id and self.requisition.tenant_id != self.tenant_id:
            raise ValidationError("Inquilino do item difere da requisição.")

        if self.lot_id and self.tenant_id and self.lot.tenant_id != self.tenant_id:
            raise ValidationError("Inquilino do item difere do lote.")

        if self.supplied_quantity and self.requested_quantity and self.supplied_quantity > self.requested_quantity:
            raise ValidationError("Quantidade aviada não pode ser maior que a solicitada.")

