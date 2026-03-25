from django.db import transaction

from apps.pharmacy.models.inventory_movement import InventoryMovement

from .inventory_rules import validate_available_inventory


@transaction.atomic
def register_output(lote, quantidade):
    validate_available_inventory(lote, quantidade)

    lote.quantidade_atual -= quantidade
    lote.save(update_fields=["quantidade_atual"])

    InventoryMovement.objects.create(
        produto=lote.produto,
        lote=lote,
        tipo="SAI",
        quantidade=quantidade,
    )


registrar_saida = register_output
