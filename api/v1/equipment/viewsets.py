"""
Facade module for equipment ViewSets.
"""

from .viewsets_impl import (
    VIEWSET_MAP,
    DailyInspectionViewSet,
    EquipmentViewSet,
    IncidentViewSet,
    MaintenanceViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "DailyInspectionViewSet",
    "EquipmentViewSet",
    "IncidentViewSet",
    "MaintenanceViewSet",
]
