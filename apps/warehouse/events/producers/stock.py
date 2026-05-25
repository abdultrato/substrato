from __future__ import annotations

from apps.warehouse.domain.stock.domain_events.events import MinimumStockReached
from apps.warehouse.events.bus.domain_event_bus import DomainEventBus


class StockEventProducer:
    def __init__(self, event_bus: DomainEventBus | None = None) -> None:
        self.event_bus = event_bus or DomainEventBus()

    def publish_minimum_stock_event(self, event: MinimumStockReached) -> None:
        self.event_bus.publish(event)
