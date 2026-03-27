from django.db.models.signals import post_save
from django.dispatch import receiver

from .models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
from .models.lot import Lot


@receiver(post_save, sender=Lot, dispatch_uid="lot_create_auto_movement")
def create_initial_inventory_movement(sender, instance: Lot, created, **kwargs):
    """
    Ao criar um novo lote, gera automaticamente um movimento de entrada
    com a quantidade inicial do lote.
    """
    if not created:
        return

    InventoryMovement.objects.create(
        lot=instance,
        tenant=instance.tenant,
        type=MovementType.ENTRADA,
        origin=MovementOrigin.AJUSTE,
        quantity=instance.initial_quantity,
        name=f"Entrada - Lote {instance.lot_number}",
    )
