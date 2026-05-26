from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4


@dataclass(frozen=True, slots=True)
class SynchronizationEvent:
    aggregate_id: str
    event_type: str
    payload: dict[str, Any] = field(default_factory=dict)
    version: int = 1
    occurred_at: datetime = field(default_factory=lambda: datetime.now(tz=UTC))
    idempotency_key: str = field(default_factory=lambda: str(uuid4()))

    def __post_init__(self) -> None:
        aggregate_id = str(self.aggregate_id or "").strip()
        event_type = str(self.event_type or "").strip()
        if not aggregate_id:
            raise ValueError("aggregate_id is required for warehouse synchronization events.")
        if not event_type:
            raise ValueError("event_type is required for warehouse synchronization events.")
        object.__setattr__(self, "aggregate_id", aggregate_id)
        object.__setattr__(self, "event_type", event_type)
        object.__setattr__(self, "version", max(1, int(self.version or 1)))
        object.__setattr__(self, "idempotency_key", str(self.idempotency_key or uuid4()))

    def to_payload(self) -> dict[str, Any]:
        return {
            "aggregate_id": self.aggregate_id,
            "event_type": self.event_type,
            "payload": dict(self.payload),
            "version": self.version,
            "occurred_at": self.occurred_at.isoformat(),
            "idempotency_key": self.idempotency_key,
        }


@dataclass(frozen=True, slots=True)
class SynchronizationPackage:
    source: str
    events: tuple[SynchronizationEvent, ...] = field(default_factory=tuple)

    def __post_init__(self) -> None:
        source = str(self.source or "").strip()
        if not source:
            raise ValueError("source is required for warehouse synchronization packages.")

        deduplicated: dict[str, SynchronizationEvent] = {}
        for event in self.events:
            normalized_event = event if isinstance(event, SynchronizationEvent) else SynchronizationEvent(**event)
            deduplicated.setdefault(normalized_event.idempotency_key, normalized_event)

        object.__setattr__(self, "source", source)
        object.__setattr__(self, "events", tuple(deduplicated.values()))

    @property
    def event_count(self) -> int:
        return len(self.events)

    def with_event(self, event: SynchronizationEvent) -> SynchronizationPackage:
        return SynchronizationPackage(source=self.source, events=(*self.events, event))

    def to_payload(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "event_count": self.event_count,
            "events": [event.to_payload() for event in self.events],
        }
