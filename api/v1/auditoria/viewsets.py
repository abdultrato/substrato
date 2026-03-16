"""
Facade module for Auditoria ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    AtividadeUsuarioViewSet,
    UsuarioAuditoriaViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "AtividadeUsuarioViewSet",
    "UsuarioAuditoriaViewSet",
]
