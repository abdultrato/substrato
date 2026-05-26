from __future__ import annotations

from dataclasses import dataclass, field
import json
import logging
from typing import Any, Protocol

logger = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class PublishedMessage:
    topic: str
    payload: dict[str, Any]
    backend: str
    delivered: bool
    error: str = ""


class QueueAdapter(Protocol):
    def publish(self, topic: str, payload: dict[str, Any]) -> PublishedMessage: ...


@dataclass(slots=True)
class InMemoryQueueAdapter:
    backend: str = "memory"
    messages: list[PublishedMessage] = field(default_factory=list)

    def publish(self, topic: str, payload: dict[str, Any]) -> PublishedMessage:
        message = PublishedMessage(
            topic=_normalize_topic(topic),
            payload=dict(payload),
            backend=self.backend,
            delivered=True,
        )
        self.messages.append(message)
        return message


@dataclass(slots=True)
class ConfiguredQueueAdapter:
    kafka_bootstrap_servers: str = ""
    rabbitmq_url: str = ""
    rabbitmq_exchange: str = "warehouse.events"
    fallback: InMemoryQueueAdapter = field(default_factory=InMemoryQueueAdapter)

    @classmethod
    def from_settings(cls) -> ConfiguredQueueAdapter:
        from django.conf import settings

        return cls(
            kafka_bootstrap_servers=getattr(settings, "KAFKA_BOOTSTRAP_SERVERS", "") or "",
            rabbitmq_url=getattr(settings, "RABBITMQ_URL", "") or "",
            rabbitmq_exchange=getattr(settings, "WAREHOUSE_RABBITMQ_EXCHANGE", "warehouse.events") or "warehouse.events",
        )

    def publish(self, topic: str, payload: dict[str, Any]) -> PublishedMessage:
        normalized_topic = _normalize_topic(topic)
        normalized_payload = dict(payload)

        if self.kafka_bootstrap_servers:
            return self._publish_to_kafka(normalized_topic, normalized_payload)
        if self.rabbitmq_url:
            return self._publish_to_rabbitmq(normalized_topic, normalized_payload)
        return self.fallback.publish(normalized_topic, normalized_payload)

    def _publish_to_kafka(self, topic: str, payload: dict[str, Any]) -> PublishedMessage:
        try:
            from confluent_kafka import Producer

            producer = Producer({"bootstrap.servers": self.kafka_bootstrap_servers})
            producer.produce(topic, json.dumps(payload, default=str).encode("utf-8"))
            producer.flush(5)
            return PublishedMessage(topic=topic, payload=payload, backend="kafka", delivered=True)
        except Exception as exc:
            logger.warning("Warehouse Kafka publish failed; using in-memory fallback.", exc_info=True)
            fallback_message = self.fallback.publish(topic, payload)
            return PublishedMessage(
                topic=fallback_message.topic,
                payload=fallback_message.payload,
                backend="memory",
                delivered=False,
                error=str(exc),
            )

    def _publish_to_rabbitmq(self, topic: str, payload: dict[str, Any]) -> PublishedMessage:
        try:
            import pika

            parameters = pika.URLParameters(self.rabbitmq_url)
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            channel.exchange_declare(exchange=self.rabbitmq_exchange, exchange_type="topic", durable=True)
            channel.basic_publish(
                exchange=self.rabbitmq_exchange,
                routing_key=topic,
                body=json.dumps(payload, default=str).encode("utf-8"),
            )
            connection.close()
            return PublishedMessage(topic=topic, payload=payload, backend="rabbitmq", delivered=True)
        except Exception as exc:
            logger.warning("Warehouse RabbitMQ publish failed; using in-memory fallback.", exc_info=True)
            fallback_message = self.fallback.publish(topic, payload)
            return PublishedMessage(
                topic=fallback_message.topic,
                payload=fallback_message.payload,
                backend="memory",
                delivered=False,
                error=str(exc),
            )


def _normalize_topic(topic: str) -> str:
    normalized = str(topic or "").strip()
    if not normalized:
        raise ValueError("topic is required for warehouse realtime messages.")
    return normalized
