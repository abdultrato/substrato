from events.base_event import BaseEvent
from events.bus import event_bus as current_event_bus


class LegacyEventBus:
    def publish(self, event, payload=None):
        if isinstance(event, str):
            return current_event_bus.publish(BaseEvent(event, payload or {}))
        return current_event_bus.publish(event)

    def publish_after_commit(self, event, payload=None):
        if isinstance(event, str):
            return current_event_bus.publish_after_commit(BaseEvent(event, payload or {}))
        return current_event_bus.publish_after_commit(event)


event_bus = LegacyEventBus()

__all__ = ["event_bus"]
