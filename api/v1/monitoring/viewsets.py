"""Facade module for monitoring viewsets."""

from .viewsets_impl import (
    CloudControlViewSet,
    ExportJobViewSet,
    TelemetryViewSet,
    VIEWSET_MAP,
    SystemErrorViewSet,
)

__all__ = [
    "CloudControlViewSet",
    "ExportJobViewSet",
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "SystemErrorViewSet",
    "TelemetryViewSet",
]
