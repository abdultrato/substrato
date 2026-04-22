"""Facade module for pharmacy viewsets."""

from .viewsets_impl import (
    VIEWSET_MAP,
    InventoryMovementViewSet,
    LotViewSet,
    MaterialRequisitionItemViewSet,
    MaterialRequisitionViewSet,
    ProductViewSet,
    SaleItemViewSet,
    SaleViewSet,
)

__all__ = [
    "VIEWSET_MAP",
    "InventoryMovementViewSet",
    "LotViewSet",
    "MaterialRequisitionItemViewSet",
    "MaterialRequisitionViewSet",
    "ProductViewSet",
    "SaleItemViewSet",
    "SaleViewSet",
]
