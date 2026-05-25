from __future__ import annotations

from enum import StrEnum


class StockState(StrEnum):
    NORMAL = "NORMAL"
    BELOW_MINIMUM = "BELOW_MINIMUM"
    REQUISITION_GENERATED = "REQUISITION_GENERATED"
    FEFO_PRIORITIZED = "FEFO_PRIORITIZED"
