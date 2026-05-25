from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class WarehouseEventAudit:
    events: list[Any] = field(default_factory=list)

    def record(self, event: Any) -> None:
        self.events.append(event)
