from __future__ import annotations

from typing import Any


class DomainEventBus:
    def __init__(self, publish_after_commit: bool = True) -> None:
        self.publish_after_commit = publish_after_commit
        self.published_events: list[Any] = []

    def publish(self, event: Any) -> None:
        converted_event = self._convert_event(event)
        try:
            from events.bus import event_bus

            if self.publish_after_commit:
                event_bus.publish_after_commit(converted_event)
            else:
                event_bus.publish(converted_event)
        except Exception:
            self.published_events.append(converted_event)

    @staticmethod
    def _convert_event(event: Any) -> Any:
        if hasattr(event, "to_corporate_event"):
            return event.to_corporate_event()
        return event
