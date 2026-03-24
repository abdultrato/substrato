"""
Facade module for Identidade ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    PasswordResetTokenViewSet,
    PerfilProfissionalViewSet,
    UsuarioViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "PasswordResetTokenViewSet",
    "PerfilProfissionalViewSet",
    "UsuarioViewSet",
]
