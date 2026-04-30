"""Facade module for monitoring viewsets."""

from .viewsets_impl import (
    ExportJobViewSet,
    VIEWSET_MAP,
    SystemErrorViewSet,
)

__all__ = [
    "ExportJobViewSet",
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "SystemErrorViewSet",
]
