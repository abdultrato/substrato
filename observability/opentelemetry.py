"""Optional OpenTelemetry bootstrap for Django entrypoints."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def inicializar_opentelemetry() -> bool:
    from django.conf import settings

    if not getattr(settings, "OTEL_ENABLED", False):
        return False

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.django import DjangoInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except Exception:
        logger.exception("OpenTelemetry esta ativo, mas os pacotes opcionais nao estao instalados.")
        return False

    resource = Resource.create({"service.name": getattr(settings, "OTEL_SERVICE_NAME", "substrato-backend")})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=getattr(settings, "OTEL_EXPORTER_OTLP_ENDPOINT", ""), timeout=5)
        )
    )
    trace.set_tracer_provider(provider)
    DjangoInstrumentor().instrument()
    return True
