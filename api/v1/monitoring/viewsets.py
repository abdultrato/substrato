"""Facade module for monitoring viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    CloudControlViewSet,
    ExportJobViewSet,
    SystemErrorViewSet,
    TelemetryViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "CloudControlViewSet",
    "ExportJobViewSet",
    "SystemErrorViewSet",
    "TelemetryViewSet",
]
