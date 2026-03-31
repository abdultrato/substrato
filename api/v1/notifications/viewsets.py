"""Facade module for notification viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    DeliveryLogViewSet,
    NotificationViewSet,
)

__all__ = [
    "VIEWSET_MAP",  # Alias -> ViewSet para roteamento dinâmico
    "DeliveryLogViewSet",
    "NotificationViewSet",
]
