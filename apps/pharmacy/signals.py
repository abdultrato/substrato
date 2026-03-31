"""Sinais automáticos da app de farmácia."""

from django.db.models.signals import post_save  # Sinal disparado após salvar
from django.dispatch import receiver  # Decorador de registrador

from .models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
from .models.lot import Lot


@receiver(post_save, sender=Lot, dispatch_uid="lot_create_auto_movement")
def create_initial_inventory_movement(sender, instance: Lot, created, **kwargs):
    """
    Ao criar um novo lote, gera automaticamente um movimento de entrada
    com a quantidade inicial do lote.
    """
    if not created:
        return  # Só executa na criação

    InventoryMovement.objects.create(
        lot=instance,  # Lote recém-criado
        tenant=instance.tenant,  # Mesmo tenant
        type=MovementType.ENTRADA,  # Movimento de entrada
        origin=MovementOrigin.AJUSTE,  # Origem ajuste inicial
        quantity=instance.initial_quantity,  # Quantidade igual ao cadastro
        name=f"Entrada - Lote {instance.lot_number}",  # Nome descritivo
    )
