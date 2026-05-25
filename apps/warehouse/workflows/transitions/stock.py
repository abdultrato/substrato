from __future__ import annotations

from dataclasses import dataclass

from apps.warehouse.workflows.states.stock import StockState


@dataclass(frozen=True, slots=True)
class StockTransition:
    from_state: StockState
    to_state: StockState
    reason: str
