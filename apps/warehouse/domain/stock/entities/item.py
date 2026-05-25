from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class StockItem:
    sku: str
    name: str
    unit: str = "UN"
    is_perishable: bool = False

    def __post_init__(self) -> None:
        sku = (self.sku or "").strip()
        if not sku:
            raise ValueError("SKU is required for a warehouse stock item.")
        object.__setattr__(self, "sku", sku)
        object.__setattr__(self, "unit", (self.unit or "UN").upper())
