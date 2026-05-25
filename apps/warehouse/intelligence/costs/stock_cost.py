from __future__ import annotations

from decimal import Decimal


def calculate_weighted_average_cost(total_value: Decimal, total_quantity: Decimal) -> Decimal:
    quantity = Decimal(str(total_quantity))
    if quantity <= 0:
        return Decimal("0")
    return Decimal(str(total_value)) / quantity
