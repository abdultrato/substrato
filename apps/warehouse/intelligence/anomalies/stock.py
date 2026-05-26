from __future__ import annotations

from decimal import Decimal

ZERO = Decimal("0")


def _non_negative(value: Decimal) -> Decimal:
    return max(Decimal(str(value)), ZERO)


def detect_anomalous_consumption(current_consumption: Decimal, historical_average: Decimal, limit_factor: Decimal = Decimal("2")) -> bool:
    average = _non_negative(historical_average)
    factor = _non_negative(limit_factor)
    if average <= 0:
        return False
    return _non_negative(current_consumption) > average * factor
