"""Facade module for monitoring viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    SystemErrorViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "SystemErrorViewSet",
]
