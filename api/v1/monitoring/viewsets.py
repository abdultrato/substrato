"""Facade module for monitoring viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    ErroSistemaViewSet,
    SystemErrorViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "ErroSistemaViewSet",
    "SystemErrorViewSet",
]
