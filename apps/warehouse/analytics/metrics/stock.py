from __future__ import annotations

from decimal import Decimal

ZERO = Decimal("0")


def _non_negative(value: Decimal) -> Decimal:
    return max(Decimal(str(value)), ZERO)


def stock_turnover(period_consumption: Decimal, average_stock: Decimal) -> Decimal:
    average = _non_negative(average_stock)
    if average <= 0:
        return ZERO
    return _non_negative(period_consumption) / average
