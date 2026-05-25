from __future__ import annotations

from typing import Any, Protocol


class QueueAdapter(Protocol):
    def publish(self, topic: str, payload: dict[str, Any]) -> None: ...
