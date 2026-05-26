from __future__ import annotations

from decimal import Decimal

ZERO = Decimal("0")


def _non_negative(value: Decimal) -> Decimal:
    return max(Decimal(str(value)), ZERO)


def simulate_days_until_stockout(current_stock: Decimal, daily_consumption: Decimal) -> int | None:
    consumption = _non_negative(daily_consumption)
    if consumption <= 0:
        return None
    return int(_non_negative(current_stock) // consumption)
