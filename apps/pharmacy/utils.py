from django.db.models import Case, F, IntegerField, Sum, When
from django.db.models.functions import Coalesce

from .models.lot import Lot


def calculate_initial_stock(product):
    """
    Soma das quantidades iniciais de todos os lotes do produto.
    Útil para reutilizar em views/API/frontend sem duplicar lógica.
    """
    return (
        Lot.objects.filter(product=product)
        .aggregate(total=Sum("initial_quantity"))
        .get("total")
        or 0
    )


def calculate_current_stock(product):
    """
    Estoque atual = estoque inicial + movimentações (entradas - saídas).
    """
    movements = (
        Lot.objects.filter(product=product)
        .aggregate(
            total=Coalesce(
                Sum(
                    Case(
                        When(movimentos__type="SAI", then=-F("movimentos__quantity")),
                        default=F("movimentos__quantity"),
                        output_field=IntegerField(),
                    )
                ),
                0,
            )
        )
        .get("total")
        or 0
    )
    return calculate_initial_stock(product) + movements
