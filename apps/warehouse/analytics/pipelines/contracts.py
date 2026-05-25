from __future__ import annotations

from typing import Any, Protocol


class WarehouseAnalyticsPipeline(Protocol):
    def process(self, event: dict[str, Any]) -> None: ...
