"""Facade module for identity viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    PasswordResetTokenViewSet,
    ProfessionalProfileViewSet,
    UserViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "PasswordResetTokenViewSet",
    "ProfessionalProfileViewSet",
    "UserViewSet",
]
