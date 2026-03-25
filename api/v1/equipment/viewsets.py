"""
Facade module for equipment ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    EquipmentViewSet,
    DailyInspectionViewSet,
    MaintenanceViewSet,
    IncidentViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "EquipmentViewSet",
    "DailyInspectionViewSet",
    "MaintenanceViewSet",
    "IncidentViewSet",
]
