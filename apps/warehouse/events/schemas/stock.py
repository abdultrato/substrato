from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from apps.warehouse.domain.stock.domain_events.events import MinimumStockReached


@dataclass(frozen=True, slots=True)
class MinimumStockEventSchema:
    name: str
    payload: dict[str, Any]
    occurred_at: datetime
    identifier: str

    @classmethod
    def from_event(cls, event: MinimumStockReached) -> MinimumStockEventSchema:
        return cls(
            name=event.name,
            payload=event.payload(),
            occurred_at=event.occurred_at,
            identifier=event.identifier,
        )
