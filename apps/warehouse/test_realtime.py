from __future__ import annotations

from django.test import override_settings
import pytest

from apps.warehouse.realtime.notifications.stock import StockNotification
from apps.warehouse.realtime.queues.adapter import ConfiguredQueueAdapter, InMemoryQueueAdapter
from apps.warehouse.realtime.streams.topics import WAREHOUSE_STOCK_TOPIC


def test_in_memory_queue_adapter_records_published_messages():
    adapter = InMemoryQueueAdapter()

    message = adapter.publish(WAREHOUSE_STOCK_TOPIC, {"sku": "SKU-001", "quantity": "5"})

    assert message.delivered is True
    assert message.backend == "memory"
    assert adapter.messages == [message]


def test_configured_queue_adapter_uses_memory_when_no_broker_is_configured():
    adapter = ConfiguredQueueAdapter()

    message = adapter.publish(WAREHOUSE_STOCK_TOPIC, {"sku": "SKU-001"})

    assert message.delivered is True
    assert message.backend == "memory"
    assert adapter.fallback.messages[0].topic == WAREHOUSE_STOCK_TOPIC


@override_settings(KAFKA_BOOTSTRAP_SERVERS="", RABBITMQ_URL="", WAREHOUSE_RABBITMQ_EXCHANGE="warehouse.events")
def test_configured_queue_adapter_can_be_built_from_django_settings():
    adapter = ConfiguredQueueAdapter.from_settings()

    assert adapter.kafka_bootstrap_servers == ""
    assert adapter.rabbitmq_url == ""
    assert adapter.rabbitmq_exchange == "warehouse.events"


def test_queue_adapter_rejects_empty_topics():
    adapter = InMemoryQueueAdapter()

    with pytest.raises(ValueError):
        adapter.publish("", {"sku": "SKU-001"})


def test_stock_notification_validates_required_fields_and_severity():
    notification = StockNotification(title="Low stock", message="SKU-001 is below minimum", severity="WARNING")

    assert notification.severity == "warning"

    with pytest.raises(ValueError):
        StockNotification(title="", message="Missing title")

    with pytest.raises(ValueError):
        StockNotification(title="Low stock", message="Invalid severity", severity="debug")
