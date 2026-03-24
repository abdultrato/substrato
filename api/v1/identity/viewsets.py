"""Facade module for identity viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    PasswordResetTokenViewSet,
    ProfessionalProfileViewSet,
    UserViewSet,
    PerfilProfissionalViewSet,
    UsuarioViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "PasswordResetTokenViewSet",
    "ProfessionalProfileViewSet",
    "UserViewSet",
    "PerfilProfissionalViewSet",
    "UsuarioViewSet",
]
