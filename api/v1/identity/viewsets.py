"""Facade module for identity viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    ProfessionalProfileViewSet,
    UserViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "ProfessionalProfileViewSet",
    "UserViewSet",
]
