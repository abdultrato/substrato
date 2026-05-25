from __future__ import annotations

from decimal import Decimal


def stock_turnover(period_consumption: Decimal, average_stock: Decimal) -> Decimal:
    average = Decimal(str(average_stock))
    if average <= 0:
        return Decimal("0")
    return Decimal(str(period_consumption)) / average
