"""Maintenance ViewSets exposed under the maintenance module."""

from api.v1.equipment.viewsets import MaintenanceViewSet

VIEWSET_MAP = {
    "maintenance": MaintenanceViewSet,
}

__all__ = [
    "VIEWSET_MAP",
    "MaintenanceViewSet",
]
