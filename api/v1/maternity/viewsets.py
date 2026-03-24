"""Facade module for maternity viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    PregnancyViewSet,
    GestacaoViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "PregnancyViewSet",
    "GestacaoViewSet",
]
