"""Facade module for bloodbank viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    BloodDonationViewSet,
    BloodStockMovementViewSet,
    BloodStorageMaintenanceViewSet,
    BloodStorageViewSet,
    BloodTransfusionViewSet,
    BloodUnitViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "BloodDonationViewSet",
    "BloodStorageViewSet",
    "BloodUnitViewSet",
    "BloodTransfusionViewSet",
    "BloodStockMovementViewSet",
    "BloodStorageMaintenanceViewSet",
]

