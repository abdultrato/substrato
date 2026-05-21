"""API v1 surface for equipment maintenance records."""

from .viewsets import VIEWSET_MAP, MaintenanceViewSet

__all__ = [
    "VIEWSET_MAP",
    "MaintenanceViewSet",
]
