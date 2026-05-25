from __future__ import annotations

from decimal import Decimal


def simulate_days_until_stockout(current_stock: Decimal, daily_consumption: Decimal) -> int | None:
    consumption = Decimal(str(daily_consumption))
    if consumption <= 0:
        return None
    return int(Decimal(str(current_stock)) // consumption)
