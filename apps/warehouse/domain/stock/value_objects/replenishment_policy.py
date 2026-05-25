from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

ZERO = Decimal("0")


@dataclass(frozen=True, slots=True)
class ReplenishmentPolicy:
    minimum_quantity: Decimal
    requisition_quantity: Decimal

    def __post_init__(self) -> None:
        minimum_quantity = Decimal(str(self.minimum_quantity))
        requisition_quantity = Decimal(str(self.requisition_quantity))
        if minimum_quantity < ZERO:
            raise ValueError("Minimum replenishment quantity cannot be negative.")
        if requisition_quantity < ZERO:
            raise ValueError("Requisition quantity cannot be negative.")
        object.__setattr__(self, "minimum_quantity", minimum_quantity)
        object.__setattr__(self, "requisition_quantity", requisition_quantity)

    def calculate_requisition_quantity(self, current_quantity: Decimal) -> Decimal:
        current = Decimal(str(current_quantity))
        shortage = self.minimum_quantity - current
        if shortage <= ZERO:
            return ZERO
        if self.requisition_quantity <= ZERO:
            return shortage
        return max(self.requisition_quantity, shortage)
