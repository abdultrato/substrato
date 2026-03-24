from django.db import transaction

from apps.pharmacy.models.inventory_movement import InventoryMovement
from domain.pharmacy.regras_estoque import validar_estoque_disponivel


@transaction.atomic
def registrar_saida(lote, quantidade):
    validar_estoque_disponivel(lote, quantidade)

    lote.quantidade_atual -= quantidade
    lote.save(update_fields=["quantidade_atual"])

    InventoryMovement.objects.create(
        produto=lote.produto,
        lote=lote,
        tipo="SAI",
        quantidade=quantidade,
    )
