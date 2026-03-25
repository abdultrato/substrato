from django.core.exceptions import ValidationError
from django.db import transaction

from apps.pharmacy.models.inventory_movement import (
    InventoryMovement,
    MovementOrigin,
    MovementType,
)
from apps.pharmacy.models.lot import Lot


class InventoryService:
    @staticmethod
    def lot_balance(lot):
        return lot.balance()

    @staticmethod
    @transaction.atomic
    def register_input(lot, quantity, origin=MovementOrigin.AJUSTE):
        return InventoryMovement.objects.create(
            lot=lot,
            type=MovementType.ENTRADA,
            origin=origin,
            quantity=quantity,
            tenant=getattr(lot, "tenant", None),
        )

    @staticmethod
    @transaction.atomic
    def register_output(lot, quantity, origin=MovementOrigin.AJUSTE, sale_item=None):
        locked_lot = Lot.objects.select_for_update().get(pk=lot.pk)
        balance = InventoryService.lot_balance(locked_lot)

        if balance < quantity:
            raise ValidationError("Insufficient inventory.")

        return InventoryMovement.objects.create(
            lot=locked_lot,
            type=MovementType.SAIDA,
            origin=origin,
            quantity=quantity,
            sale_item=sale_item,
            tenant=getattr(locked_lot, "tenant", None),
        )


EstoqueService = InventoryService
InventoryService.saldo_lot = InventoryService.lot_balance
InventoryService.registrar_entrada = InventoryService.register_input
InventoryService.registrar_saida = InventoryService.register_output
