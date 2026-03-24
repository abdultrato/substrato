"""
Facade module for Entidades ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    EmpresaViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "EmpresaViewSet",
]
