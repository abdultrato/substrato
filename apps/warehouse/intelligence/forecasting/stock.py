from __future__ import annotations

from collections.abc import Iterable
from decimal import Decimal

ZERO = Decimal("0")


def _non_negative(value: Decimal) -> Decimal:
    return max(Decimal(str(value)), ZERO)


def forecast_average_consumption(daily_consumption: Iterable[Decimal], horizon_days: int) -> Decimal:
    samples = [_non_negative(value) for value in daily_consumption]
    if not samples or horizon_days <= 0:
        return ZERO
    average = sum(samples, ZERO) / Decimal(len(samples))
    return average * Decimal(horizon_days)
