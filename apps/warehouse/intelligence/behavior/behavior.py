from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class StockBehaviorSignal:
    sku: str
    signal: str
    score: float
