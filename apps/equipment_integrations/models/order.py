"""Ordens/worklists enviadas para equipamentos integrados."""

from django.core.exceptions import ValidationError
from django.db import models

from core.models.base import NoNameCoreModel


class IntegrationOrder(NoNameCoreModel):
    """
    Ordem (worklist) que o equipment consome. Geralmente corresponde a uma
    RequisicaoAnalise agrupada por equipment.
    """

    prefix = "ORD"  # Prefixo para IDs amigáveis

    class Status(models.TextChoices):
        PENDING = "PEND", "Pendente"
        SENT = "SEND", "Enviada"
        IN_PROGRESS = "EXEC", "Em execução"
        DONE = "DONE", "Concluída"
        ERROR = "ERRO", "Erro"
        CANCELED = "CANC", "Cancelada"

    equipment = models.ForeignKey(

        "integracoes_equipamentos.IntegrationEquipment",

        db_column="equipment_id",
        on_delete=models.PROTECT,
        related_name="orders",
        db_index=True,
    )
    request = models.ForeignKey(
        "clinical.LabRequest",
        db_column="request_id",
        on_delete=models.PROTECT,
        related_name="integration_orders",
        db_index=True,
    )

    status = models.CharField(

        db_column="status",

        max_length=4,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    observation = models.TextField(

        db_column="observation",

        blank=True, default="")

    class Meta:
        db_table = "integracoes_equipamentos_integracaoordem"
        verbose_name = "Ordem (Integração)"
        verbose_name_plural = "Ordens (Integração)"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["equipment", "request"],
                condition=models.Q(deleted=False),
                name="unique_order_por_equipment_request",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "equipment", "status"]),
            models.Index(fields=["request"]),
        ]

    def clean(self):
        super().clean()
        if self.equipment_id and self.request_id and self.equipment.tenant_id != self.request.tenant_id:
            raise ValidationError("Equipamento e requisição devem pertencer ao mesmo tenant.")

    def __str__(self) -> str:
        return f"{self.custom_id} - {self.equipment}"


class IntegrationOrderItem(NoNameCoreModel):
    prefix = "ORDIT"

    class Status(models.TextChoices):
        PENDING = "PEND", "Pendente"
        IN_PROGRESS = "EXEC", "Em execução"
        DONE = "DONE", "Concluído"
        ERROR = "ERRO", "Erro"
        CANCELED = "CANC", "Cancelado"

    order = models.ForeignKey(

        IntegrationOrder,

        db_column="order_id",
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
    )
    request_item = models.ForeignKey(
        "clinical.LabRequestItem",
        db_column="request_item_id",
        on_delete=models.PROTECT,
        related_name="integration_order_items",
        db_index=True,
    )

    status = models.CharField(

        db_column="status",

        max_length=4,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    class Meta:
        db_table = "integracoes_equipamentos_integracaoordemitem"
        verbose_name = "Item de order (Integração)"
        verbose_name_plural = "Itens de order (Integração)"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["order", "request_item"],
                condition=models.Q(deleted=False),
                name="unique_item_por_order",
            )
        ]
        indexes = [
            models.Index(fields=["tenant", "order", "status"]),
        ]

    def clean(self):
        super().clean()
        if self.order_id and self.request_item_id and self.order.request_id != self.request_item.request_id:
            raise ValidationError("Item deve pertencer à mesma requisição da order.")

    def __str__(self) -> str:
        return f"{self.order_id} - item {self.request_item_id}"
