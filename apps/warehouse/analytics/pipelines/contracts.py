from __future__ import annotations

from typing import Any, Protocol


class PipelineAnalyticsWarehouse(Protocol):
    def processar(self, evento: dict[str, Any]) -> None: ...
