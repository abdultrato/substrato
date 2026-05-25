from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ConfiguracaoObservabilidadeWarehouse:
    prometheus_enabled: bool
    opentelemetry_enabled: bool
    service_name: str
    otlp_endpoint: str

    @classmethod
    def a_partir_settings(cls) -> ConfiguracaoObservabilidadeWarehouse:
        from django.conf import settings

        return cls(
            prometheus_enabled=True,
            opentelemetry_enabled=getattr(settings, "OTEL_ENABLED", False),
            service_name=getattr(settings, "OTEL_SERVICE_NAME", "substrato"),
            otlp_endpoint=getattr(settings, "OTEL_EXPORTER_OTLP_ENDPOINT", ""),
        )
