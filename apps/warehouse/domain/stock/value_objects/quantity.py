from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

ZERO = Decimal("0")


@dataclass(frozen=True, slots=True)
class StockQuantity:
    value: Decimal
    unit: str = "UN"

    def __post_init__(self) -> None:
        value = Decimal(str(self.value))
        if value < ZERO:
            raise ValueError("Stock quantity cannot be negative.")
        object.__setattr__(self, "value", value)
        object.__setattr__(self, "unit", (self.unit or "UN").upper())

    def is_below(self, minimum_quantity: Decimal) -> bool:
        return self.value < Decimal(str(minimum_quantity))
