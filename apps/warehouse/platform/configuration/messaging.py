from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ConfiguracaoMensageriaWarehouse:
    event_backbone: str
    rabbitmq_url: str
    kafka_bootstrap_servers: str
    kafka_topic_prefix: str
    rabbitmq_exchange: str

    @classmethod
    def a_partir_settings(cls) -> ConfiguracaoMensageriaWarehouse:
        from django.conf import settings

        return cls(
            event_backbone=getattr(settings, "WAREHOUSE_EVENT_BACKBONE", "local"),
            rabbitmq_url=getattr(settings, "RABBITMQ_URL", ""),
            kafka_bootstrap_servers=getattr(settings, "KAFKA_BOOTSTRAP_SERVERS", ""),
            kafka_topic_prefix=getattr(settings, "WAREHOUSE_KAFKA_TOPIC_PREFIX", "warehouse"),
            rabbitmq_exchange=getattr(settings, "WAREHOUSE_RABBITMQ_EXCHANGE", "warehouse.events"),
        )
