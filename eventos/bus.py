import logging
from collections import defaultdict

logger = logging.getLogger("metrics")


class EventBus:
    """
    Event dispatcher interno.
    """

    def __init__(self):
        self._subscribers = defaultdict(list)

    def subscribe(self, event_name, handler):
        self._subscribers[event_name].append(handler)
        logger.info(f"Subscribed {handler.__name__} → {event_name}")

    def publish(self, event_name, payload=None):
        handlers = self._subscribers.get(event_name, [])

        if not handlers:
            logger.warning(f"No handlers for event: {event_name}")
            return

        for handler in handlers:
            try:
                handler(payload)
            except Exception as e:
                logger.exception(f"Erro no handler {handler.__name__}: {e}")


event_bus = EventBus()
