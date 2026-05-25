from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True, slots=True)
class GenerateStockRequisition:
    sku: str
    quantity: Decimal
    reason: str = "MINIMUM_STOCK_REACHED"
    warehouse_id: str | None = None
    tenant_id: str | None = None
