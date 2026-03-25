"""Facade module for identity viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    PasswordResetTokenViewSet,
    PerfilProfissionalViewSet,
    ProfessionalProfileViewSet,
    UserViewSet,
    UsuarioViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "PasswordResetTokenViewSet",
    "PerfilProfissionalViewSet",
    "ProfessionalProfileViewSet",
    "UserViewSet",
    "UsuarioViewSet",
]
