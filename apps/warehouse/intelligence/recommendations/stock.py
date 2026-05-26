from __future__ import annotations

from decimal import Decimal

ZERO = Decimal("0")


def _non_negative(value: Decimal) -> Decimal:
    return max(Decimal(str(value)), ZERO)


def recommend_replenishment(forecast_consumption: Decimal, current_stock: Decimal, safety_stock: Decimal = ZERO) -> Decimal:
    required = _non_negative(forecast_consumption) + _non_negative(safety_stock) - _non_negative(current_stock)
    return max(ZERO, required)
