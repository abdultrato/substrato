from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ConfiguracaoFilaTempoReal:
    backbone: str
    rabbitmq_url: str
    kafka_bootstrap_servers: str

    @classmethod
    def a_partir_settings(cls) -> ConfiguracaoFilaTempoReal:
        from django.conf import settings

        return cls(
            backbone=getattr(settings, "WAREHOUSE_EVENT_BACKBONE", "local"),
            rabbitmq_url=getattr(settings, "RABBITMQ_URL", ""),
            kafka_bootstrap_servers=getattr(settings, "KAFKA_BOOTSTRAP_SERVERS", ""),
        )
