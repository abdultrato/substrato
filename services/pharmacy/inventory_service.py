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
            lote=lot,
            tipo=MovementType.ENTRADA,
            origem=origin,
            quantidade=quantity,
            inquilino=getattr(lot, "inquilino", None),
        )

    @staticmethod
    @transaction.atomic
    def register_output(lot, quantity, origin=MovementOrigin.AJUSTE, sale_item=None):
        locked_lot = Lot.objects.select_for_update().get(pk=lot.pk)
        balance = InventoryService.lot_balance(locked_lot)

        if balance < quantity:
            raise ValidationError("Insufficient inventory.")

        return InventoryMovement.objects.create(
            lote=locked_lot,
            tipo=MovementType.SAIDA,
            origem=origin,
            quantidade=quantity,
            item_venda=sale_item,
            inquilino=getattr(locked_lot, "inquilino", None),
        )


EstoqueService = InventoryService
InventoryService.saldo_lote = InventoryService.lot_balance
InventoryService.registrar_entrada = InventoryService.register_input
InventoryService.registrar_saida = InventoryService.register_output
