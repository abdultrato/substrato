"""Facade module for maternity viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    GestacaoViewSet,
    PregnancyViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "GestacaoViewSet",
    "PregnancyViewSet",
]
