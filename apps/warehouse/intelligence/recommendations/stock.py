from __future__ import annotations

from decimal import Decimal

ZERO = Decimal("0")


def recommend_replenishment(forecast_consumption: Decimal, current_stock: Decimal, safety_stock: Decimal = ZERO) -> Decimal:
    required = Decimal(str(forecast_consumption)) + Decimal(str(safety_stock)) - Decimal(str(current_stock))
    return max(ZERO, required)
