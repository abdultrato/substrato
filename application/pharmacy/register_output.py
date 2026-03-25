from django.db import transaction

from apps.pharmacy.models.inventory_movement import InventoryMovement

from .inventory_rules import validate_available_inventory


@transaction.atomic
def register_output(lot, quantity):
    validate_available_inventory(lot, quantity)

    lot.quantity_atual -= quantity
    lot.save(update_fields=["quantity_atual"])

    InventoryMovement.objects.create(
        product=lot.product,
        lot=lot,
        type="SAI",
        quantity=quantity,
    )


registrar_saida = register_output
