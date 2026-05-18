from __future__ import annotations

from collections import defaultdict
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
import logging
from typing import Any
from uuid import uuid4

logger = logging.getLogger("substrato_os.events")


@dataclass(frozen=True, slots=True)
class EventEnvelope:
    """
    Canonical event contract for the distributed runtime.
    """

    name: str
    payload: dict[str, Any]
    tenant_id: str | None = None
    source: str = "substrato.runtime"
    event_id: str = field(default_factory=lambda: str(uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(tz=UTC))

    def as_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "name": self.name,
            "payload": self.payload,
            "tenant_id": self.tenant_id,
            "source": self.source,
            "occurred_at": self.occurred_at.isoformat(),
        }


EventHandler = Callable[[EventEnvelope], None]


class InMemoryEventStream:
    """
    In-process event stream for local dispatch and test/runtime bootstrap.
    """

    def __init__(self) -> None:
        self._subscribers: dict[str, list[EventHandler]] = defaultdict(list)
        self._events: list[EventEnvelope] = []

    def subscribe(self, event_name: str, handler: EventHandler) -> None:
        handlers = self._subscribers[event_name]
        if handler in handlers:
            return
        handlers.append(handler)

    def publish(self, event: EventEnvelope) -> None:
        self._events.append(event)
        handlers = [*self._subscribers.get(event.name, []), *self._subscribers.get("*", [])]
        for handler in handlers:
            try:
                handler(event)
            except Exception:
                logger.exception(
                    "Event handler failure for event=%s handler=%s",
                    event.name,
                    getattr(handler, "__name__", repr(handler)),
                )

    @property
    def events(self) -> tuple[EventEnvelope, ...]:
        return tuple(self._events)
