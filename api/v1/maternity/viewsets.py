"""
Facade module for Maternidade ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    GestacaoViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "GestacaoViewSet",
]
