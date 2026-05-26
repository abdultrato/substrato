from __future__ import annotations

from decimal import Decimal

ZERO = Decimal("0")


def _non_negative(value: Decimal) -> Decimal:
    return max(Decimal(str(value)), ZERO)


def calculate_weighted_average_cost(total_value: Decimal, total_quantity: Decimal) -> Decimal:
    quantity = _non_negative(total_quantity)
    if quantity <= 0:
        return ZERO
    return _non_negative(total_value) / quantity
