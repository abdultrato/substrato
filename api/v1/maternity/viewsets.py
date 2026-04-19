"""Facade module for maternity viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    PregnancyViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "PregnancyViewSet",
]
