from __future__ import annotations

from decimal import Decimal


def detect_anomalous_consumption(current_consumption: Decimal, historical_average: Decimal, limit_factor: Decimal = Decimal("2")) -> bool:
    average = Decimal(str(historical_average))
    if average <= 0:
        return False
    return Decimal(str(current_consumption)) > average * Decimal(str(limit_factor))
