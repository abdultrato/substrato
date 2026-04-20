"""Funções utilitárias para cálculos de estoque."""

from django.db.models import Case, Exists, F, IntegerField, OuterRef, Sum, When  # Construções de agregação
from django.db.models.functions import Coalesce  # Troca None por zero

from .models.inventory_movement import InventoryMovement, MovementOrigin, MovementType
from .models.lot import Lot  # Modelo de lote usado nas consultas


def calculate_initial_stock(product):
    """
    Soma das quantidades iniciais de todos os lotes do produto.
    Útil para reutilizar em views/API/frontend sem duplicar lógica.
    """
    return (
        Lot.objects.filter(product=product)  # Filtra lotes do produto
        .aggregate(total=Sum("initial_quantity"))  # Soma campo initial_quantity
        .get("total")  # Obtém o valor do dicionário agregado
        or 0  # Substitui None por zero
    )


def calculate_current_stock(product):
    """
    Estoque atual agregando saldo real por lote.
    Evita dupla contagem quando o lote já possui movimento inicial automático.
    """
    has_initial_entry = Exists(
        InventoryMovement.all_objects.filter(
            lot_id=OuterRef("pk"),
            deleted=False,
            type=MovementType.ENTRADA,
            origin=MovementOrigin.AJUSTE,
            quantity=OuterRef("initial_quantity"),
        )
    )

    lots = Lot.objects.filter(product=product).annotate(
        movimentos_total=Coalesce(
            Sum(
                Case(
                    When(
                        movimentos__type=MovementType.SAIDA,
                        then=-F("movimentos__quantity"),
                    ),
                    default=F("movimentos__quantity"),
                    output_field=IntegerField(),
                )
            ),
            0,
        ),
        has_initial_entry=has_initial_entry,
    )

    total = lots.aggregate(
        total=Coalesce(
            Sum(
                Case(
                    When(has_initial_entry=True, then=F("movimentos_total")),
                    default=F("initial_quantity") + F("movimentos_total"),
                    output_field=IntegerField(),
                )
            ),
            0,
        )
    ).get("total")

    return total or 0
