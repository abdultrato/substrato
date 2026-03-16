"""
Facade module for Monitoramento ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    ErroSistemaViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ErroSistemaViewSet",
]
